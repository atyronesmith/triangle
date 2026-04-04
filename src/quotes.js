/**
 * Quotes about AI, productivity, business operations, and hype.
 * Sentiment: 0 = very negative, 5 = neutral, 10 = very positive.
 */

const QUOTES = [
  // ===== VERY NEGATIVE (0-1) =====
  { s: 0, q: "We shipped faster than ever last quarter. We also shipped more bugs than ever. Nobody connected the two.", a: "Anonymous engineering director" },
  { s: 0, q: "The AI generated 10,000 lines of code in a week. It took us three months to understand what it did.", a: "Senior developer, post-mortem" },
  { s: 0, q: "Our velocity metrics look incredible. Our customers are leaving.", a: "VP of Engineering" },
  { s: 1, q: "We replaced understanding with generation and called it productivity.", a: "Staff engineer resignation letter" },
  { s: 1, q: "The junior engineers think this is normal. That's the part that scares me.", a: "Tech lead, anonymous survey" },
  { s: 0, q: "Nobody reads the AI-generated code. Nobody reads the AI-generated tests. Nobody reads the AI-generated docs. What exactly are we reviewing?", a: "Code review meeting notes" },
  { s: 1, q: "We automated ourselves into a codebase nobody understands.", a: "CTO, board meeting" },
  { s: 0, q: "The AI doesn't hallucinate. It confabulates with supreme confidence. That's worse.", a: "ML researcher" },
  { s: 1, q: "Every incident report now starts with 'the AI-generated code appeared to work correctly in testing.'", a: "SRE team lead" },
  { s: 0, q: "We saved $2M on developer productivity tools. We spent $8M on incidents caused by those tools.", a: "CFO, annual review" },
  { s: 1, q: "The best engineers left first. They could see what was coming.", a: "Engineering manager" },
  { s: 0, q: "AI-generated code has a half-life. It works today. Nobody knows if it works tomorrow.", a: "Principal engineer" },
  { s: 1, q: "We used to ship with confidence. Now we ship with fingers crossed.", a: "QA lead" },
  { s: 0, q: "The dashboard says productivity is up 40%. The team says they've never been more exhausted.", a: "Agile coach" },
  { s: 1, q: "Technical debt isn't a metaphor anymore. It's a literal invoice that comes due.", a: "VP Engineering" },
  { s: 0, q: "Three engineers quit this month. All three cited 'being required to ship code I know isn't good enough' as the primary reason.", a: "Exit interview summary" },
  { s: 1, q: "The AI wrote the feature in an hour. The team spent two weeks debugging it. Net: slower than writing it ourselves.", a: "Sprint retrospective" },
  { s: 0, q: "Our AI adoption is at 93%. Our customer satisfaction is at a five-year low. Coincidence is not the word I'd use.", a: "Customer success lead" },
  { s: 1, q: "Management sees the output numbers and thinks we're thriving. The team sees the quality numbers and knows we're drowning.", a: "Anonymous engineer" },
  { s: 0, q: "We optimized for the metric and destroyed the thing the metric was supposed to measure.", a: "Goodhart's Law in practice" },
  { s: 0, q: "The code review backlog is now longer than the development backlog. We've moved the bottleneck, not removed it.", a: "Scrum master" },
  { s: 1, q: "The people who left took context that no onboarding doc captures. The people who stayed inherited code they didn't write and can't maintain.", a: "Engineering retrospective" },
  { s: 0, q: "We're shipping features at twice the speed with three times the rollbacks.", a: "Release manager" },
  { s: 1, q: "The AI can write a microservice in minutes. It has no idea why that microservice shouldn't exist.", a: "System architect" },
  { s: 0, q: "Our test suite has 95% coverage. Half the tests were written by AI and test nothing meaningful.", a: "QA engineer" },
  { s: 1, q: "We don't have a productivity problem. We have a comprehension crisis.", a: "VP Platform" },
  { s: 0, q: "The interns think the AI output is authoritative. Nobody told them it's a suggestion engine.", a: "Mentorship program lead" },
  { s: 1, q: "Every sprint we generate more output. Every sprint the product gets worse. The math works if you don't look at it.", a: "Product owner" },

  // ===== NEGATIVE (2-3) =====
  { s: 2, q: "AI is the fastest way to create a legacy codebase from scratch.", a: "Conference talk, 2025" },
  { s: 2, q: "You can see AI everywhere except in the productivity statistics.", a: "Daron Acemoglu, MIT economist" },
  { s: 3, q: "We're generating more code than we can understand. That's not a capability problem. It's a governance problem.", a: "CISO" },
  { s: 2, q: "The review burden didn't decrease. It changed shape. Now I'm reviewing output I didn't write, can't predict, and may not fully understand.", a: "Senior developer" },
  { s: 3, q: "AI makes the easy parts trivial and the hard parts invisible.", a: "Software architect" },
  { s: 2, q: "Measuring AI productivity by lines of code generated is like measuring a restaurant by pounds of food served.", a: "Engineering blog post" },
  { s: 3, q: "The models will get better. The organizational habits we're building now won't.", a: "VP of Product" },
  { s: 2, q: "We didn't save time. We traded production time for evaluation time, and evaluation is harder.", a: "Tech lead" },
  { s: 3, q: "Every generation thinks their productivity tool is the one that breaks the iron triangle. The triangle always holds.", a: "Project management textbook" },
  { s: 2, q: "AI-generated code passes tests because AI also generated the tests. That's not validation. That's a closed loop.", a: "QA engineer" },
  { s: 3, q: "The hardest part of AI adoption isn't the technology. It's convincing leadership that the metrics they love are lying to them.", a: "Engineering director" },
  { s: 2, q: "We have 10x more pull requests and 10x more things to review. Net productivity gain: approximately zero.", a: "Dubach synthesis, 2026" },
  { s: 3, q: "AI doesn't eliminate work. It transforms work into different work. Whether that's an improvement depends on what you measure.", a: "Organizational psychologist" },
  { s: 2, q: "The METR study found developers believed AI made them 24% faster while actually making them 19% slower. We built an industry on that perception gap.", a: "Tech journalist" },
  { s: 3, q: "Fast now, slow later. The J-curve of AI adoption is real, and most organizations are still on the wrong side of it.", a: "McKinsey report" },
  { s: 2, q: "Forty-five percent of AI-generated code introduced OWASP Top 10 vulnerabilities. We shipped it anyway because the deadline didn't move.", a: "Veracode study" },
  { s: 2, q: "AI-generated code contains 2.74x more security vulnerabilities than human-written code. We call this productivity.", a: "CodeRabbit, 2025" },
  { s: 3, q: "We have better tools and more work. The cognitive load hasn't decreased — it's shifted from execution to coordination.", a: "Team health survey" },
  { s: 2, q: "The Jevons Paradox is 160 years old. We're surprised it applies to AI. We shouldn't be.", a: "Economic historian" },
  { s: 3, q: "AI makes writing code feel free. Understanding code still costs the same. That gap is where every problem lives.", a: "Staff engineer" },
  { s: 2, q: "We automated the wrong 80%. The 20% that matters is still manual, and now it's buried under the other 80%.", a: "Platform architect" },
  { s: 3, q: "If your AI strategy is 'generate more, review less,' your actual strategy is 'accumulate debt faster.'", a: "Engineering advisor" },
  { s: 2, q: "The org chart says we have 200 engineers. The codebase says we have 200 engineers and 50 unsupervised interns.", a: "Code quality report" },
  { s: 3, q: "Amdahl's Law isn't pessimistic. It's physics. You can't argue with the serial fraction.", a: "Systems engineer" },

  // ===== NEUTRAL-NEGATIVE (4) =====
  { s: 4, q: "AI is a very good tool used by people who don't understand what 'very good' means in this context.", a: "Statistician" },
  { s: 4, q: "The question isn't whether AI helps. It's whether the help exceeds the cost of verifying the help.", a: "Economics professor" },
  { s: 4, q: "Act like the skeptic, hope for the optimist. Budget for real overhead.", a: "Iron Triangle simulator" },
  { s: 4, q: "Coal-efficient steam engines didn't reduce coal consumption. They increased it. AI-efficient coding tools won't reduce coding demand.", a: "Jevons, updated" },
  { s: 4, q: "If AI speeds up 40% of your workflow by 3x, Amdahl says your total speedup is 1.36x, not 3x.", a: "Systems engineer" },
  { s: 4, q: "The organizations that benefit most from AI are the ones disciplined enough not to consume all the gains as new scope.", a: "Management consultant" },
  { s: 4, q: "AI makes the average developer more productive and the excellent developer irreplaceable.", a: "CTO" },
  { s: 4, q: "We're not in a productivity crisis. We're in a measurement crisis.", a: "Organizational researcher" },
  { s: 4, q: "The gap between what AI can do and what organizations can absorb is where most of the value is lost.", a: "Change management consultant" },
  { s: 4, q: "Speed without direction is just velocity. AI gives us speed. Strategy gives us direction.", a: "Product manager" },
  { s: 4, q: "The ROI of AI depends entirely on what you count and what you ignore.", a: "CFO" },
  { s: 4, q: "Efficiency gains that aren't protected by scope discipline become Jevons' next meal.", a: "Economist" },
  { s: 4, q: "Every AI tool demo shows generation. No AI tool demo shows the six hours of review that follows.", a: "Developer advocate" },
  { s: 4, q: "The serial fraction is the constraint that matters, not the speedup of the parallel fraction.", a: "Gene Amdahl's ghost" },
  { s: 4, q: "AI is deflationary for production and inflationary for expectations. The net effect depends on which force is stronger.", a: "Economist" },

  // ===== NEUTRAL (5) =====
  { s: 5, q: "AI is not a faster typewriter. It's a different kind of worker with different failure modes.", a: "Software engineering researcher" },
  { s: 5, q: "The iron triangle didn't break. The frontier moved. And management moved the goalposts further.", a: "Project manager" },
  { s: 5, q: "Both positions are internally consistent. The skeptic points to every prior technology cycle. The optimist points to the qualitative difference.", a: "Industry analyst" },
  { s: 5, q: "The right amount of AI is the amount your organization can review, understand, and maintain.", a: "Engineering VP" },
  { s: 5, q: "AI adoption is not a technology decision. It's an organizational design decision.", a: "Management professor" },
  { s: 5, q: "Every tool changes the work. The question is whether the changed work is better work.", a: "Philosopher of technology" },
  { s: 5, q: "Spreadsheets didn't make accountants obsolete. They made new kinds of analysis possible. Then demanded more analysis, faster, from fewer people.", a: "Economic historian" },
  { s: 5, q: "The honest answer is nobody knows yet. Anyone who tells you otherwise is selling something.", a: "Research scientist" },
  { s: 5, q: "We're in the phase where the technology works but the institutions haven't adapted. This gap is where all the pain lives.", a: "Organizational theorist" },
  { s: 5, q: "The marginal cost of generating code approaches zero. The marginal cost of understanding code does not.", a: "Computer scientist" },
  { s: 5, q: "New book releases tripled after LLMs. Average quality declined. The top releases got better. That's Jevons plus selection.", a: "Reimers & Waldfogel, 2026" },
  { s: 5, q: "374 S&P 500 companies mentioned AI in earnings calls as entirely positive. Productivity statistics remained flat.", a: "NBER, 2026" },
  { s: 5, q: "The difference between AI helping and AI hurting is entirely in how the organization absorbs the output.", a: "Organizational researcher" },
  { s: 5, q: "Every technology that made workers more productive eventually made workers busier. AI is no different.", a: "Labor historian" },
  { s: 5, q: "The Jevons Paradox tells us efficiency creates demand. The question for AI is: is that demand for things we actually need?", a: "Economist" },
  { s: 5, q: "As the unit price of intelligence falls, firms redesign their architectures to consume dramatically more of it.", a: "Zhang & Zhang, 2026" },
  { s: 5, q: "The metric that matters isn't how much code AI generates. It's how much of that code is still in production six months later.", a: "Principal engineer" },
  { s: 5, q: "We're optimizing for throughput in a system that's constrained by comprehension.", a: "Systems thinker" },
  { s: 5, q: "AI changes what's bottlenecked, not whether there's a bottleneck.", a: "Operations researcher" },
  { s: 5, q: "The triangle is a useful forcing function: it makes you name which constraint you're relaxing and which you're holding.", a: "This tool" },

  // ===== NEUTRAL-POSITIVE (6) =====
  { s: 6, q: "AI won't replace developers. But developers who use AI will replace developers who don't.", a: "Industry keynote" },
  { s: 6, q: "The boring middle — boilerplate, scaffolding, data transforms — is where AI creates genuine value. Don't oversell beyond that.", a: "Staff engineer" },
  { s: 6, q: "AI-assisted code review catches vulnerability classes that human reviewers consistently miss.", a: "Security researcher" },
  { s: 6, q: "The best teams use AI to amplify judgment, not replace it.", a: "Engineering manager" },
  { s: 6, q: "Our test coverage went from 40% to 85% after introducing AI-generated tests. Not all of them are good tests. But many are.", a: "QA manager" },
  { s: 6, q: "AI is the best intern I've ever had. Fast, tireless, and confidently wrong about 15% of the time.", a: "Senior developer" },
  { s: 6, q: "The organizations getting real value from AI are the quiet ones. They're not on stage talking about it. They're shipping.", a: "VC partner" },
  { s: 6, q: "AI lets me spend less time writing glue code and more time thinking about architecture. That's genuine.", a: "Software architect" },
  { s: 6, q: "When the tools let you iterate 10x faster, you can explore design spaces that were previously too expensive to consider.", a: "Product designer" },
  { s: 6, q: "The pragmatic approach: budget for 15-20% actual gains, invest the rest in review infrastructure, and be pleasantly surprised if you get more.", a: "Engineering director" },
  { s: 6, q: "The teams getting value from AI have one thing in common: they invested as much in review infrastructure as in generation tools.", a: "DevOps consultant" },
  { s: 6, q: "Partial rebound is the most common outcome. Efficiency gains still yield benefit, just less than engineering estimates suggest.", a: "Energy economics, applied to AI" },
  { s: 6, q: "The sweet spot is AI for generation, humans for judgment, and disciplined review connecting the two.", a: "Engineering VP" },
  { s: 6, q: "AI doesn't make bad engineers good. It makes good engineers fast.", a: "Hiring manager" },
  { s: 6, q: "The first draft is free. The understanding is not. But starting from a first draft beats starting from nothing.", a: "Technical writer" },

  // ===== POSITIVE (7-8) =====
  { s: 7, q: "For the first time in my career, the bottleneck is my thinking speed, not my typing speed.", a: "Full-stack developer" },
  { s: 7, q: "AI didn't eliminate developer demand. It made software viable for use cases where development cost was previously prohibitive.", a: "Labor economist, 2025" },
  { s: 7, q: "We're building in a week what used to take a quarter. Not all of it is good. But the iteration speed changes what's possible.", a: "Startup founder" },
  { s: 7, q: "Nonfarm business productivity increased 4.9% in Q3 2025 — a pattern not seen since 2019.", a: "Bureau of Labor Statistics" },
  { s: 8, q: "The review burden is temporary. Model capability improves on a steep curve. Budget for 2024-level review in a 2026 plan and you're overspending.", a: "AI researcher" },
  { s: 7, q: "I used to spend 60% of my time on boilerplate. Now I spend 60% of my time on the interesting problems. That's not a small change.", a: "Backend developer" },
  { s: 8, q: "AI-generated first drafts aren't perfect. They're starting points that would have taken me two days to reach. Now I start from day-two quality.", a: "Technical writer" },
  { s: 7, q: "Junior developers with AI tools are shipping at the level of mid-level developers from three years ago.", a: "Engineering manager" },
  { s: 8, q: "Five drafts cost the same as one. Ten test variants cost the same as one. This changes the scope/quality tradeoff fundamentally.", a: "AI optimist" },
  { s: 7, q: "The assembly line didn't speed up car production. It made cars affordable. AI is doing the same thing with software.", a: "Tech historian" },
  { s: 8, q: "AI handles the 80% of coding that's pattern matching. Humans handle the 20% that's judgment. That split is correct.", a: "ML engineer" },
  { s: 7, q: "Our documentation went from nonexistent to comprehensive in two months. AI wrote the first draft. Humans refined it. Everybody won.", a: "Developer relations" },
  { s: 8, q: "AI-assisted prototyping lets us kill bad ideas in days instead of months. The savings aren't in building faster — they're in failing faster.", a: "Product manager" },
  { s: 7, q: "When iteration is free, experimentation becomes the default. When experimentation is the default, innovation accelerates.", a: "R&D director" },
  { s: 8, q: "Software engineering jobs accelerated sharply after the initial AI dip. AI made software viable where it wasn't before.", a: "Labor market analysis, 2025" },
  { s: 7, q: "AI-first companies aren't replacing developers. They're attempting things that previously required too many developers to be economical.", a: "Industry analyst" },
  { s: 7, q: "The code isn't always right. But it's always a useful starting point. That distinction matters more than people think.", a: "Developer" },
  { s: 8, q: "Our time-to-market dropped from 6 months to 6 weeks. Quality held because we invested equally in AI review.", a: "VP Product" },
  { s: 7, q: "AI is the great equalizer. Small teams can now compete with enterprises on feature velocity.", a: "Indie developer" },
  { s: 8, q: "We went from 'we can't afford to build that' to 'let's prototype it this afternoon.' That changes which ideas survive.", a: "Product strategist" },

  // ===== VERY POSITIVE (9-10) =====
  { s: 9, q: "AI performs cognitive work that previously required additional humans. You haven't sped up the line — you've added workers who don't need salaries.", a: "AI bull case" },
  { s: 9, q: "We deployed to production 340 times last month. Pre-AI, we deployed 12 times. The quality metrics are identical.", a: "DevOps lead" },
  { s: 10, q: "Near-zero marginal iteration cost. This isn't incremental improvement. This is a phase change in what's economically possible.", a: "AI researcher" },
  { s: 9, q: "AI doesn't just accelerate existing work — it enables categories of work that weren't worth attempting.", a: "Product visionary" },
  { s: 10, q: "We're three people building what used to require thirty. The economics of software creation have permanently shifted.", a: "YC founder" },
  { s: 9, q: "The teams that figured out AI-assisted review are getting both speed and quality. It's not a tradeoff anymore.", a: "VP Engineering" },
  { s: 10, q: "Historical discontinuities are real. This one is real. The iron triangle is becoming irrelevant.", a: "True believer" },
  { s: 9, q: "When a tool can draft, reason, and iterate on its own output, you haven't just improved the process — you've changed what a process is.", a: "AI philosopher" },
  { s: 9, q: "Model capability improves on a steep curve. The people planning around current limitations are planning for a world that won't exist by the time they ship.", a: "AI lab researcher" },
  { s: 10, q: "The question isn't whether AI changes everything. It's whether your organization adapts fast enough to benefit from the change.", a: "Transformation consultant" },
  { s: 9, q: "The 10x engineer was a myth. The 10x engineer-with-AI-tools is reality.", a: "Startup CTO" },
  { s: 10, q: "We shipped a feature to 50M users that was conceived, designed, built, tested, and deployed in 72 hours. All three engineers slept 8 hours a night.", a: "Startup post-mortem (the good kind)" },
  { s: 9, q: "AI-generated code quality now exceeds the median human developer for routine tasks. The floor has risen.", a: "Benchmark study, 2026" },
  { s: 10, q: "The paradigm shifted. The people still debating whether it shifted are standing in the old paradigm wondering where everyone went.", a: "AI evangelist" },
  { s: 9, q: "Our bug rate dropped 40% after adopting AI review. Not because AI review is perfect, but because it catches different bugs than humans do.", a: "Quality engineering" },
  { s: 10, q: "In five years we'll look back at pre-AI software development the way we look at hand-compiled assembly language.", a: "Futurist" },
  { s: 9, q: "The constraint isn't capability anymore. It's imagination. AI removed the production bottleneck and revealed that ideas were always the scarce resource.", a: "Creative director" },
  { s: 10, q: "We used to estimate in weeks. Now we estimate in hours. And we're usually right.", a: "Team lead" },
]

/**
 * Map simulation state to a sentiment score (0-10).
 */
function stateToSentiment(state) {
  const q = state.quality || 100
  const debt = state.techDebt || 0
  const morale = state.teamMorale || 100

  const qualScore = q / 10
  const debtScore = (100 - debt) / 10
  const moraleScore = morale / 10

  return Math.round(qualScore * 0.4 + debtScore * 0.3 + moraleScore * 0.3)
}

/**
 * Sentiment → color gradient.
 * 0 = red (#E24B4A), 5 = amber (#EF9F27), 10 = green (#1D9E75)
 */
function sentimentColor(s) {
  if (s <= 5) {
    // Red → Amber
    const t = s / 5
    const r = Math.round(226 + (239 - 226) * t)
    const g = Math.round(75 + (159 - 75) * t)
    const b = Math.round(74 + (39 - 74) * t)
    return `rgb(${r},${g},${b})`
  } else {
    // Amber → Green
    const t = (s - 5) / 5
    const r = Math.round(239 + (29 - 239) * t)
    const g = Math.round(159 + (158 - 159) * t)
    const b = Math.round(39 + (117 - 39) * t)
    return `rgb(${r},${g},${b})`
  }
}

function pickQuote(sentiment) {
  const candidates = QUOTES.filter(q => Math.abs(q.s - sentiment) <= 2)
  if (candidates.length === 0) return QUOTES[Math.floor(Math.random() * QUOTES.length)]
  return candidates[Math.floor(Math.random() * candidates.length)]
}

let quoteEl = null
let quoteTimer = null

export function initQuotes() {
  quoteEl = document.getElementById('quote-display')
  if (!quoteEl) return
  showQuote({ quality: 100, techDebt: 0, teamMorale: 100 })
}

export function updateQuoteSentiment(state) {
  if (!quoteEl) return
  quoteEl._simState = state
}

function showQuote(state) {
  if (!quoteEl) return
  const sentiment = stateToSentiment(state)
  const quote = pickQuote(sentiment)
  const color = sentimentColor(quote.s)

  quoteEl.innerHTML = `<span class="quote-text" style="color:${color}">\u201c${quote.q}\u201d</span><span class="quote-attr">\u2014 ${quote.a}</span>`
  quoteEl.className = 'quote-content'
}

export function startQuoteTimer() {
  if (quoteTimer) return
  quoteTimer = setInterval(() => {
    if (quoteEl && quoteEl._simState) showQuote(quoteEl._simState)
  }, 30000)
}
