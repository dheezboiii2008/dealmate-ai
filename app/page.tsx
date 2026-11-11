"use client";
import { useState } from "react";

type Deal = {
  agreed: boolean; price: number; buyer_message: string; vendor_message: string;
  terms: string; milestones: { title: string; amount: number }[];
  transcript?: { agent: string; counter: number; message: string }[];
};

export default function Home() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [role, setRole] = useState("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [project, setProject] = useState("");
  const [budget, setBudget] = useState("500");
  const [offer, setOffer] = useState("650");
  const [currency, setCurrency] = useState("USD");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [payment, setPayment] = useState<{ id: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function authenticate() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, role, mode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in");
      setRole(data.role || role); setSignedIn(true); setNotice(data.message || "Signed in.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Authentication failed"); }
    finally { setBusy(false); }
  }

  async function negotiate() {
    setBusy(true); setNotice(""); setDeal(null); setPayment(null);
    try {
      const response = await fetch("/api/negotiate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project, budget: Number(budget), offer: Number(offer), currency }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Negotiation failed");
      setDeal(data);
      if (!data.agreed) setNotice("No agreement was reached. Adjust the budget, offer or scope and try again.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Negotiation failed"); }
    finally { setBusy(false); }
  }

  async function createPayment() {
    if (!deal?.agreed) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/paypal/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: deal.price, currency, description: project.slice(0, 120) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment link could not be created");
      setPayment(data);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Payment creation failed"); }
    finally { setBusy(false); }
  }

  return <main className="shell">
    <nav className="nav"><div className="brand">DealMate<span>AI</span></div><div className="pill">Two agents. One fair deal.</div></nav>
    <section className="hero"><div className="eyebrow">AI-powered freelance dealmaking</div><h1>Make every deal a <span style={{ color: "#91a8ff" }}>win-win.</span></h1><p>BuyerBot and SellerBot negotiate project pricing and terms, then a neutral mediator checks whether a fair agreement is possible.</p></section>

    {!signedIn ? <div className="grid">
      <section className="card"><h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2><p className="muted">Sign in with your email to open your negotiation workspace.</p>
        <div className="tabs"><button className={`tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")}>Sign up</button><button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Log in</button></div>
        <div className="field"><label>Email address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className="field"><label>Password (at least 8 characters)</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /></div>
        {mode === "signup" && <div className="field"><label>Account type</label><select value={role} onChange={e => setRole(e.target.value)}><option value="buyer">Buyer / Client</option><option value="vendor">Vendor / Freelancer</option></select></div>}
        <button className="btn" disabled={busy} onClick={authenticate}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}</button>
        {notice && <div className="notice">{notice}</div>}
        <p className="small">Account creation and login require your Supabase environment variables and email settings.</p>
      </section>
      <section className="card"><div className="eyebrow">The process</div><h2>From first offer to checkout.</h2><div className="notice">01 · Describe the project and budget</div><div className="notice">02 · BuyerBot makes a counter-offer</div><div className="notice">03 · SellerBot responds with its position</div><div className="notice">04 · A neutral mediator checks the deal</div><div className="notice success">05 · Create a PayPal checkout after agreement</div></section>
    </div> : <>
      <div className="row" style={{ marginBottom: 18 }}><div><div className="eyebrow">Your workspace</div><h2 style={{ margin: "7px 0" }}>Deal negotiation</h2><span className="pill">{role === "buyer" ? "Buyer account" : "Vendor account"}</span></div><button className="tab" onClick={() => { setSignedIn(false); setDeal(null); setPayment(null); setNotice(""); }}>Sign out</button></div>
      <div className="grid">
        <section className="card"><h2>Start a negotiation</h2><p className="muted">Give both agents enough context to negotiate a realistic deal.</p>
          <div className="field"><label>Project description</label><textarea value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Build a responsive five-page business website, including contact form and deployment…" /></div>
          <div className="grid"><div className="field"><label>Buyer's maximum budget</label><input type="number" min="1" value={budget} onChange={e => setBudget(e.target.value)} /></div><div className="field"><label>Vendor's opening offer</label><input type="number" min="1" value={offer} onChange={e => setOffer(e.target.value)} /></div></div>
          <div className="field"><label>Currency</label><select value={currency} onChange={e => setCurrency(e.target.value)}><option value="USD">USD</option><option value="INR">INR</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="AUD">AUD</option><option value="CAD">CAD</option></select></div>
          <button className="btn" disabled={busy || !project.trim()} onClick={negotiate}>{busy ? "Agents are negotiating…" : "Start AI negotiation"}</button>
        </section>
        <section className="card"><h2>Negotiation result</h2><p className="muted">The agent messages, proposed terms and payment checkout appear here.</p>
          {!deal ? <div className="chat">Your negotiation transcript will appear here when both agents have taken their turns.</div> : <>
            <div className={deal.agreed ? "notice success" : "notice"}>{deal.agreed ? "Potential agreement reached — review before proceeding." : "No agreement reached yet."}</div>
            {deal.agreed && <div className="price">{currency} {deal.price.toFixed(2)}</div>}
            <div className="chat"><b>BuyerBot</b>{"\n"}{deal.buyer_message}{"\n\n"}<b>SellerBot</b>{"\n"}{deal.vendor_message}</div>
            <h3>Proposed terms</h3><p className="muted">{deal.terms}</p>
            {deal.milestones?.length > 0 && <><h3>Suggested milestones</h3>{deal.milestones.map((m, i) => <div className="row" key={i}><span className="muted">{m.title}</span><b>{currency} {Number(m.amount).toFixed(2)}</b></div>)}</>}
            {deal.agreed && <button className="btn" disabled={busy} onClick={createPayment}>Generate PayPal checkout link</button>}
            {payment && <div className="notice success"><b>PayPal checkout created</b><p className="small">Order ID: {payment.id}</p><a className="btn" href={payment.url} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center" }}>Open PayPal checkout ↗</a></div>}
          </>}
          {notice && <div className="notice">{notice}</div>}
        </section>
      </div>
      <p className="small" style={{ marginTop: 20 }}>Payment links create PayPal checkout orders. This is not escrow; do not treat a browser redirect as proof of payment. The parties must independently review and accept the final terms.</p>
    </>}
  </main>;
}
