/**
 * Named team personas — narrative layer on top of aggregate morale.
 * Persona morale is derived from aggregate + personal quirks; it never changes sim math.
 */

const ROSTER = [
  {
    id: 'sarah',
    name: 'Sarah Chen',
    role: 'Staff Engineer',
    seniorityLevel: 'senior',
    specialty: 'Architecture & quality',
    hireBias: 0.8,
    hates: { lowReview: true, highScope: true },
    loves: { pragmatism: true },
  },
  {
    id: 'marcus',
    name: 'Marcus Webb',
    role: 'Senior IC',
    seniorityLevel: 'senior',
    specialty: 'Systems & performance',
    hireBias: 0.7,
    hates: { highAiMgmt: true, churn: true },
    loves: { deepWork: true },
  },
  {
    id: 'priya',
    name: 'Priya Patel',
    role: 'Engineering Mgr',
    seniorityLevel: 'senior',
    specialty: 'Team & delivery',
    hireBias: 0.9,
    hates: { lowMorale: true, compressedTime: true },
    loves: { healthyTeam: true },
  },
  {
    id: 'jay',
    name: 'Jay Rodriguez',
    role: 'Engineer I',
    seniorityLevel: 'junior',
    specialty: 'AI-native workflows',
    hireBias: 0.3,
    hates: { highDebt: true },
    loves: { highAiGen: true },
  },
  {
    id: 'dana',
    name: 'Dana Kim',
    role: 'Tech Lead',
    seniorityLevel: 'senior',
    specialty: 'Mentorship',
    hireBias: 0.75,
    hates: { flatSeniority: true, burnout: true },
    loves: { teaching: true },
  },
  {
    id: 'alex',
    name: 'Alex Morgan',
    role: 'QA/Security',
    seniorityLevel: 'mid',
    specialty: 'Risk & review',
    hireBias: 0.5,
    hates: { lowReviewHighAi: true, incidents: true },
    loves: { rigor: true },
  },
]

const QUIT_MSGS = {
  sarah: [
    "Sarah just handed in her notice. Twelve years of domain knowledge walking out the door. She told Priya privately: 'I can't keep shipping code I don't trust.' Her calendar is already full of interviews for next week.",
    "Sarah's gone. She spent her last two weeks writing documentation nobody will read in time. The architecture decisions in her head — the ones she never had time to write down — left with her.",
    "Sarah accepted an offer elsewhere. The role description said 'strong engineering culture.' She didn't have to say what that implied about here.",
  ],
  marcus: [
    "Marcus Webb submitted his notice today. He'd stopped speaking up in design reviews three weeks ago. The team mistook silence for agreement. It was resignation.",
    "Marcus is out. He told a colleague: 'I came here to solve hard problems. Lately I've just been reviewing agent output and fixing things nobody understands.' His next role has no AI mandate.",
    "Marcus accepted a new offer. His last commit message: 'Cleanup: remove dead code from sprint 14.' Nobody asked what he really thought.",
  ],
  priya: [
    "Priya Patel is leaving. She'd been running interference between leadership and the team for months — absorbing pressure upward, shielding the team downward. Both sides finally ran out of patience with her.",
    "Priya gave notice. Her exit interview was uncomfortable. She was careful with her words but her retro notes told the full story — she'd been writing them for two quarters with nobody reading them.",
    "Priya accepted a role at a company with 'a healthier engineering culture.' She meant it as feedback. It wasn't received that way.",
  ],
  jay: [
    "Jay Rodriguez quit. Surprising everyone — Jay was the most optimistic about AI on the team. But optimism about tools isn't the same as optimism about the org. 'I love building. I hate firefighting debt I didn't create.'",
    "Jay's gone. They were learning fast, mentored by Dana, getting good. Then the debt pile hit and all the interesting work turned into incident response. They found somewhere that would let them actually build.",
    "Jay submitted their notice. Their final Slack message: 'Thanks for the opportunities. Learned a lot.' Priya read it three times trying to find the subtext. There wasn't any. That was the point.",
  ],
  dana: [
    "Dana Kim is leaving. She'd built mentorship loops into her calendar — pair sessions, architecture walkthroughs, code review coaching. One by one, they got cancelled for 'higher priority work.' Eventually she stopped rescheduling them.",
    "Dana gave notice. She's been the connective tissue — the person who knew why things were built the way they were and could explain it to new hires. That institutional memory walks out with her Friday.",
    "Dana accepted a Tech Lead role at a smaller company. 'I want to actually mentor people again,' she told a friend. 'Here I was just triaging what the agents produced.'",
  ],
  alex: [
    "Alex Morgan quit. The review queue has been weeks deep for months and leadership's response was to reduce the review slider, not add capacity. Alex stopped pushing back when it became clear the answer was always the same.",
    "Alex is out. Their last security ticket sat unactioned for six weeks. They'd opened it, escalated it, and eventually closed it themselves with 'won't fix per product decision.' That was their last one.",
    "Alex accepted a security engineering role elsewhere. Their farewell message included a detailed rundown of every open vulnerability. It was their most thorough documentation yet. Nobody had asked for it.",
  ],
}

const BURNOUT_MSGS = {
  sarah: [
    "Sarah is burning out. She's still in the design reviews but she's stopped pushing back. 'Architecture decisions' is now a checkbox, not a conversation. You can see it if you've worked with her long enough.",
    "Sarah looks exhausted. She's reviewing PRs at midnight and her comments have gotten shorter — 'LGTM' where she used to write paragraphs. The quality bar she held the team to is quietly lowering.",
    "Sarah's hitting a wall. She asked Priya last week to take a week off. Priya said it wasn't a good time. Sarah hasn't asked again.",
  ],
  marcus: [
    "Marcus is burning out. He used to block out two hours daily for deep work — no meetings, no Slack. Those blocks are gone. His calendar is all standup syncs and incident reviews now.",
    "Marcus has gone quiet in design discussions. He still has opinions; he's stopped sharing them. When senior engineers go quiet, the team loses early warning signals they didn't know they were relying on.",
    "Marcus stopped filing enhancement issues last month. He used to catch architectural drift before it became technical debt. That early warning system is offline.",
  ],
  priya: [
    "Priya is burning out. She's the person everyone goes to when things go wrong — which means she absorbs every cross-functional collision personally. There's no tier above her to escalate to.",
    "Priya cancelled her 1:1s for the third week running. She's switched from 'developing the team' mode to 'keeping the team from falling apart' mode. Those are different jobs and only one pays.",
    "Priya looks tired in a way that days off don't fix. She's been in that mode for a while now. The team hasn't noticed yet. They will when she's gone.",
  ],
  jay: [
    "Jay is burning out. The review queue is deeper than ever and half the tickets are regressions from code they wrote two months ago but don't fully understand anymore. 'I thought AI was supposed to make this easier.'",
    "Jay has stopped asking questions in Slack. They used to be full of 'quick questions' that weren't quick at all — they were learning. The learning stopped when there was no time for it.",
    "Jay is losing their enthusiasm fast. They came in excited about AI-native engineering. They're spending most of their time debugging AI output in production. The gap between the pitch and the reality is getting visible.",
  ],
  dana: [
    "Dana is burning out. The review queue is ~3 weeks deep for a month. They've stopped commenting on new PRs — just approving them. You can see it in the commit-vs-review ratio if you look.",
    "Dana has stopped scheduling the junior mentorship sessions. She still means to. There's just no time. Jay has noticed. They've started going to Stack Overflow instead of to Dana.",
    "Dana is struggling. She told Marcus she feels like she's managing a triage ward rather than building a team. That's an accurate description.",
  ],
  alex: [
    "Alex is burning out. The review queue has been ~3 weeks deep for a month. They've stopped commenting on new PRs — just approving them. You can see it in the commit-vs-review ratio if you look.",
    "Alex has started rubber-stamping reviews. They know it. They're not happy about it. But the queue is endless and the pressure to ship is constant and there's only one Alex.",
    "Alex filed a detailed security assessment two weeks ago. Nobody read it. They know because they left a deliberately wrong severity rating to see if anyone would catch it. Nobody did.",
  ],
}

const PRAISE_MSGS = {
  sarah: [
    "Sarah caught a subtle coupling issue in code review that would have cost a sprint to untangle later. The kind of catch that only happens when an engineer has both deep context and enough review bandwidth.",
    "Sarah's architecture proposal is elegant. She's been thinking about this particular problem for two months and it shows. This is what senior time looks like when it's not consumed by incident response.",
    "Sarah ran a working session on the new data model. Three junior engineers came out understanding something they'd been confused about for weeks. Institutional knowledge flowing outward, not locked in one head.",
  ],
  marcus: [
    "Marcus found a performance regression before it hit production — profiled it, traced it to an AI-generated edge case, documented the pattern. The kind of work that prevents incidents instead of responding to them.",
    "Marcus has been doing deep work this week. Two long stretches of focus, no meetings, and a genuine architectural improvement that'll pay dividends for quarters. This is why senior engineers need protected time.",
    "Marcus caught an AI hallucination in a critical path — the generated code looked plausible, passed linting, but would have silently dropped data under load. Only someone who read it carefully would have noticed.",
  ],
  priya: [
    "Priya ran a genuinely useful retrospective. Not a ritual — the team identified two process changes that actually shipped in the next sprint. Rare. This is what good EM work looks like.",
    "Priya negotiated a scope reduction that gave the team room to breathe. She presented it to stakeholders as 'quality investment' rather than 'the team is struggling.' Both are true. One gets approved.",
    "Priya had one-on-ones with every engineer this week and acted on two things they raised. The team noticed. They don't always say so. They noticed.",
  ],
  jay: [
    "Jay Rodriguez built a repeatable AI workflow that cut a whole class of boilerplate in half. They documented it, shared it with the team, and three other engineers adopted it by the end of the week.",
    "Jay is learning fast — asked Dana a great question in code review about why the architecture was structured the way it is. Dana's answer turned into a 30-minute walkthrough. Senior time well spent.",
    "Jay caught their own bug in review before it merged. They've started reading AI output critically rather than trusting it by default. That instinct takes some people years to develop.",
  ],
  dana: [
    "Dana is mentoring Jay through a gnarly refactor. Senior time well spent — exactly the kind of compounding investment that doesn't show up in velocity charts.",
    "Dana ran an informal architecture walk this afternoon — no agenda, no deck, just a whiteboard session with the three newest engineers. Two hours of tribal knowledge transfer that onboarding docs never capture.",
    "Dana pair-programmed with Jay for a full afternoon. The output was good. The real output was the next six months of Jay asking better questions.",
  ],
  alex: [
    "Alex completed a thorough security audit this sprint. Found three issues that would have been expensive to fix in production. The review slider is paying off.",
    "Alex's review caught a prompt injection vulnerability in the AI integration layer. Low probability, high impact if exploited. This is why you have Alex.",
    "Alex wrote a new test coverage policy for AI-generated code. Boring-looking document, high leverage. Engineers who read it will ship fewer incidents. Some won't read it. Alex knows which ones.",
  ],
}

export function getRoster() {
  return ROSTER
}

export function initTeamState() {
  return Object.fromEntries(
    ROSTER.map(p => [p.id, { morale: 100, status: 'active' }])
  )
}

export const resetTeamState = initTeamState

/**
 * Compute per-persona morale offset based on their likes/dislikes vs current sliders.
 * Returns a delta (negative = penalty, positive = bonus) relative to aggregate morale.
 */
function personalOffset(persona, { sliders, techDebt, effectiveSeniority }) {
  let delta = 0
  const { aiGen = 0, aiReview = 0, aiMgmt = 0, review = 0, scope = 0, time = 0 } = sliders

  if (persona.hates.lowReview && review < 15) delta -= 12
  if (persona.hates.highScope && scope > 60) delta -= 10
  if (persona.hates.highAiMgmt && aiMgmt > 50) delta -= 12
  if (persona.hates.churn && scope > 70) delta -= 8
  if (persona.hates.lowMorale) delta -= 0 // driven by aggregate, already captured
  if (persona.hates.compressedTime && time < -15) delta -= 12
  if (persona.hates.highDebt && techDebt > 40) delta -= 15
  if (persona.hates.flatSeniority && effectiveSeniority < 30) delta -= 12
  if (persona.hates.burnout && techDebt > 50) delta -= 10
  // Alex: loses morale when high AI gen + low review (low review-to-gen ratio signals incidents)
  if (persona.hates.lowReviewHighAi && aiGen > 50 && review < 15) delta -= 15
  if (persona.hates.incidents && techDebt > 60) delta -= 8

  if (persona.loves.pragmatism && review > 15 && scope < 60) delta += 6
  if (persona.loves.deepWork && aiMgmt < 30 && scope < 50) delta += 6
  if (persona.loves.healthyTeam) delta += 0 // captured by aggregate
  if (persona.loves.highAiGen && aiGen > 40) delta += 10
  if (persona.loves.teaching && effectiveSeniority > 40) delta += 6
  if (persona.loves.rigor && review > 25) delta += 8

  return delta
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Returns { newTeamState, events }.
 * events: Array<{ type: 'quit'|'burnout'|'praise', personaId, msg }>
 */
export function updateTeamState(prevTeamState, { aggregateMorale, sliders, techDebt, effectiveSeniority, seniorityDrift }) {
  const newTeamState = {}
  const events = []
  let quitThisTick = false

  for (const persona of ROSTER) {
    const prev = prevTeamState[persona.id] || { morale: 100, status: 'active' }
    if (prev.status === 'quit') {
      newTeamState[persona.id] = prev
      continue
    }

    const offset = personalOffset(persona, { sliders, techDebt, effectiveSeniority })
    // Persona morale trends toward (aggregate + offset), clamped [0, 100]
    const target = Math.max(0, Math.min(100, aggregateMorale + offset))
    // Smooth approach — no instantaneous jump
    const newPersonalMorale = Math.max(0, Math.min(100, prev.morale + (target - prev.morale) * 0.15))

    let newStatus = prev.status

    if (newPersonalMorale < 25 && prev.status === 'active') {
      newStatus = 'burnt-out'
      events.push({ type: 'burnout', personaId: persona.id, msg: pick(BURNOUT_MSGS[persona.id]) })
    } else if (prev.status === 'burnt-out' && newPersonalMorale < 15 && !quitThisTick) {
      // Quit probability scales with seniority level — seniors have more options
      const quitProb = persona.seniorityLevel === 'senior' ? 0.07
        : persona.seniorityLevel === 'mid' ? 0.04
        : 0.025
      if (Math.random() < quitProb) {
        newStatus = 'quit'
        quitThisTick = true
        events.push({ type: 'quit', personaId: persona.id, msg: pick(QUIT_MSGS[persona.id]) })
      }
    }

    // Praise — only when active, morale high, loves conditions met, low random rate
    if (newStatus === 'active' && newPersonalMorale > 75 && Math.random() < 1 / 40) {
      const { aiGen = 0, review = 0 } = sliders
      const lovesConditionMet =
        (persona.loves.pragmatism && review > 15 && sliders.scope < 60) ||
        (persona.loves.deepWork && sliders.aiMgmt < 30) ||
        (persona.loves.highAiGen && aiGen > 40) ||
        (persona.loves.teaching && effectiveSeniority > 40) ||
        (persona.loves.rigor && review > 25)

      if (lovesConditionMet) {
        events.push({ type: 'praise', personaId: persona.id, msg: pick(PRAISE_MSGS[persona.id]) })
      }
    }

    newTeamState[persona.id] = { morale: newPersonalMorale, status: newStatus }
  }

  return { newTeamState, events }
}
