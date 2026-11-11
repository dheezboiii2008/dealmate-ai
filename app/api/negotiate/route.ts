import { NextResponse } from "next/server";

type AgentReply = { counter: number; message: string; terms: string };

async function askAgent(system: string, prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("AI negotiation is not configured yet. Add OPENAI_API_KEY to enable live AI negotiation.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.35,
    }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "An AI agent could not complete its turn.");
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("The AI agent returned an empty response.");
  return JSON.parse(raw);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = typeof body.project === "string" ? body.project.trim().slice(0, 4000) : "";
    const budget = Number(body.budget);
    const offer = Number(body.offer);
    const currency = typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency) ? body.currency : "USD";

    if (!project || !Number.isFinite(budget) || !Number.isFinite(offer) || budget <= 0 || offer <= 0 || budget > 10000000 || offer > 10000000) {
      return NextResponse.json({ error: "Enter a project description and valid positive budget and vendor offer." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI negotiation is not configured yet. Add OPENAI_API_KEY to enable live AI negotiation." }, { status: 503 });
    }

    // Turn 1: the buyer's agent makes a reasoned counter-offer without exceeding the buyer's cap.
    const buyer = await askAgent(
      "You are BuyerBot, a careful buyer-side negotiation agent. Protect the buyer's stated maximum budget. Be respectful, explain trade-offs, and never counter above the budget. Return JSON only.",
      `Project: ${project}\nBuyer maximum budget: ${budget} ${currency}\nVendor opening offer: ${offer} ${currency}\nReturn JSON with counter (number), message (string), and terms (string). The counter must be positive and no higher than the buyer maximum.`
    ) as AgentReply;

    // Turn 2: the vendor's agent responds to the buyer's counter-offer.
    const seller = await askAgent(
      "You are SellerBot, a freelancer-side negotiation agent. Protect the vendor's value while remaining constructive. Never pretend the buyer has accepted. Return JSON only.",
      `Project: ${project}\nVendor opening offer: ${offer} ${currency}\nBuyer agent counter-offer: ${Number(buyer.counter)} ${currency}\nBuyer agent message: ${String(buyer.message || "").slice(0, 1200)}\nReturn JSON with counter (number), message (string), and terms (string). Keep the counter positive and explain any scope or deadline trade-off that could make it workable.`
    ) as AgentReply;

    // Final neutral review: only mark agreement when the two positions overlap within the buyer's cap.
    const final = await askAgent(
      "You are an impartial deal mediator. Assess whether the buyer and vendor positions genuinely overlap. Never claim both parties accepted if the numbers do not overlap. Return JSON only.",
      `Project: ${project}\nCurrency: ${currency}\nBuyer maximum: ${budget}\nVendor opening: ${offer}\nBuyer agent counter: ${Number(buyer.counter)}\nBuyer agent terms: ${String(buyer.terms || "").slice(0, 1000)}\nVendor agent counter: ${Number(seller.counter)}\nVendor agent terms: ${String(seller.terms || "").slice(0, 1000)}\nIf a reasonable mutually acceptable price exists at or below the buyer maximum, return agreed=true and a price between the two counters. Otherwise return agreed=false and price=0. Return keys: agreed (boolean), price (number), terms (string), milestones (array of {title, amount}). Do not invent acceptance or payment status.`
    );

    const price = Number(final.price);
    const agreed = final.agreed === true && Number.isFinite(price) && price > 0 && price <= budget;
    return NextResponse.json({
      agreed,
      price: agreed ? Math.round(price * 100) / 100 : 0,
      buyer_message: String(buyer.message || "Buyer agent submitted a counter-offer."),
      vendor_message: String(seller.message || "Vendor agent responded to the counter-offer."),
      terms: String(final.terms || "Review and confirm the project scope, delivery date, and acceptance criteria with both parties."),
      milestones: Array.isArray(final.milestones) ? final.milestones : [],
      transcript: [
        { agent: "BuyerBot", counter: Number(buyer.counter), message: String(buyer.message || "") },
        { agent: "SellerBot", counter: Number(seller.counter), message: String(seller.message || "") },
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Negotiation failed" }, { status: 500 });
  }
}
