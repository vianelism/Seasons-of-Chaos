export type ScheduledActivity = {
  id: string;
  scheduledAt: string;
  phase: string;
  title: string;
  body: string;
};

const halloweenPrompts = [
  "Drop the first Halloween thing you spotted this year.",
  "Candy corn: delicious, decorative, or tiny wax betrayal?",
  "Show us a costume you loved—your own, a kid's, a pet's, or an internet masterpiece.",
  "What spooky movie can you rewatch forever?",
  "Post today's most seasonally appropriate meme.",
  "Pumpkin carving: artist, enthusiast, or supervision-only department?",
  "Tell us the weirdest thing your child has ever wanted to be for Halloween.",
  "Choose one: haunted house, hayride, corn maze, or staying home in peace.",
  "Share a spooky story—real, fictional, local, or approximately believable.",
  "What Halloween candy are you confiscating in the name of parental safety?",
  "Show us your decorations, including the one item doing all the work.",
  "Which fictional witch would survive your household for a week?",
  "Post a childhood Halloween photo if you have one—or describe the costume evidence.",
  "Halloween hot take: what tradition can go directly into the cauldron?",
  "Drop your current October mood using one GIF or emote.",
  "Costume check: planned, purchased, improvised, or future-me's emergency?",
  "What is scarier: a ghost, a group text, or realizing tomorrow is picture day?",
  "Share a pumpkin creation, craft, snack, or beautifully abandoned attempt.",
  "Halloween trivia: Which vegetable was traditionally carved before pumpkins became popular? Answer reveal tomorrow.",
  "Trivia reveal: turnips! Today's question: What do you call a fear of Halloween?",
  "Trivia reveal: samhainophobia. Name a Halloween song that immediately activates your skeleton.",
  "Pick the movie-night vibe: silly spooky, nostalgic, genuinely scary, or background chaos.",
  "Build the server's ideal Halloween snack table. What are you bringing?",
  "Which monster would be the best babysitter, and why is your reasoning suspiciously detailed?",
  "Show us today's tiny October joy.",
  "Tell us your funniest trick-or-treating disaster or childhood Halloween memory.",
  "Last-minute costume laboratory: share your best no-time, no-budget idea.",
  "Nominate a Halloween superlative: Most Likely to Have Candy Hidden, Best Chaos Energy, or invent one.",
  "Post your Halloween-week survival status: thriving, festive-ish, or held together by mini chocolate.",
  "Final preparation check: costumes, candy, batteries, emotional support beverage?",
  "Happy Halloween! Drop photos, costumes, pumpkins, candy reports, memes, or simply proof you survived. 🎃",
];

const scheduled = (id: string, date: string, phase: string, title: string, body: string): ScheduledActivity => ({
  id, scheduledAt: `${date}T16:00:00.000Z`, phase, title, body,
});

export const FALL_2026_ACTIVITIES: readonly ScheduledActivity[] = [
  scheduled("fall-launch", "2026-09-01", "September — Cozy Fall Kickoff", "🍂 FALL INTO CHAOS BEGINS", "Welcome to Fall Into Chaos. Participate constantly, once, late, or not today—real life wins. Start us off: what does 'cozy fall' mean in your house?"),
  scheduled("sep-this-or-that-1", "2026-09-04", "September — Cozy Fall Kickoff", "🍁 Fall This-or-That", "Pumpkin patch or apple orchard? Sweater weather or blanket weather? Reply whenever you wander in."),
  scheduled("sep-photo-dump", "2026-09-08", "September — Cozy Fall Kickoff", "📸 Fall Photo Dump", "Share one fall-ish photo: weather, food, kids, pets, décor, a leaf doing its best—anything counts."),
  scheduled("sep-mom-bingo", "2026-09-12", "September — Cozy Fall Kickoff", "🎯 Mom Bingo Check-In", "How many happened this week: reheated coffee, lost cup, mystery laundry, snack negotiation, hid in the bathroom, forgot why you entered a room? Claim the square; no evidence required."),
  scheduled("sep-hot-take", "2026-09-17", "September — Cozy Fall Kickoff", "🔥 Seasonal Debate", "Name one beloved fall thing you do not understand. Respectful chaos only."),
  scheduled("sep-cozy-check", "2026-09-22", "September — Cozy Fall Kickoff", "☕ Cozy Nonsense", "What tiny comfort is carrying you this week? It can be profound or literally a beverage."),
  scheduled("sep-wrap", "2026-09-28", "September — Cozy Fall Kickoff", "🍂 September Roll Call", "Drop a meme, photo, thought, or one-word status. Showing up late is still showing up."),
  ...halloweenPrompts.map((body, index) => scheduled(`oct-${String(index + 1).padStart(2, "0")}`, `2026-10-${String(index + 1).padStart(2, "0")}`, "October — Halloween Chaos", `🎃 Halloween Chaos · Day ${index + 1}`, body)),
  scheduled("nov-table", "2026-11-02", "November — Discord Friendsgiving", "🍽️ Our Imaginary Friendsgiving Table", "You are bringing one real dish, one ridiculous dish, or one useful non-food contribution. What is it?"),
  scheduled("nov-recipe", "2026-11-06", "November — Discord Friendsgiving", "🥧 Recipe Swap", "Share a reliable recipe, shortcut, store-bought hero, or the food you refuse to make yourself."),
  scheduled("nov-hot-take", "2026-11-10", "November — Discord Friendsgiving", "🔥 Thanksgiving Hot Takes", "Best side? Worst side? Is pie breakfast? State your case and prepare for friendly paperwork."),
  scheduled("nov-bingo", "2026-11-14", "November — Discord Friendsgiving", "🎯 Thanksgiving Survival Bingo", "Mark what applies: schedule changed, someone asked an invasive question, forgot an ingredient, child ate only bread, hid for five minutes, leftovers saved the day."),
  scheduled("nov-appreciation", "2026-11-18", "November — Discord Friendsgiving", "❤️ Mom Supporting Moms", "Tag or describe something another mom did that made life lighter. Quiet appreciation counts too."),
  scheduled("nov-disaster", "2026-11-22", "November — Discord Friendsgiving", "😂 Holiday Confessional", "Tell us a cooking disaster, family-chaos story, or tiny thing already testing your patience."),
  scheduled("nov-gratitude", "2026-11-26", "November — Discord Friendsgiving", "🦃 Friendsgiving Drop-In", "No polished gratitude list required. Share one good thing, one ridiculous thing, or just an emote proving you are alive."),
  scheduled("nov-leftovers", "2026-11-29", "November — Discord Friendsgiving", "🥡 Leftovers & Recovery", "What survived the weekend: food, patience, traditions, or none of the above?"),
  ...[
    "Show one decoration, light, corner, or seasonal object currently bringing joy.",
    "Holiday movie roll call: comfort favorite, controversial favorite, or absolutely not.",
    "Share a December meme that understands you better than most people.",
    "Childhood photo day: post one if you want, or describe the fashion choices involved.",
    "Holiday trivia: Which reindeer name means thunder? Answer reveal tomorrow.",
    "Trivia reveal: Donner. Today's mission: name a tradition you would happily keep forever.",
    "Guess the Mom: share one surprising holiday fact about yourself and let everyone guess whose it is.",
    "Digital Secret Santa idea drop: share a free meme, playlist, recipe, phone wallpaper, compliment, or tiny digital creation for the group.",
    "What are you simplifying, skipping, or refusing to feel guilty about this month?",
    "Show us the reality behind the festive photo—or the festive-ish reality instead.",
    "Build the ultimate holiday snack plate using only things already in your house.",
    "12 Days finale: check in with a win, disaster, photo, meme, or one exhausted emote. You did enough.",
  ].map((body, index) => scheduled(`dec-day-${index + 1}`, `2026-12-${String(index + 1).padStart(2, "0")}`, "December — Holiday Chaos", `🎄 12 Days of Discord · Day ${index + 1}`, body)),
  scheduled("dec-survival", "2026-12-18", "December — Holiday Chaos", "✨ Festive-ish Check-In", "However and whatever you celebrate, how are you actually doing? Full answers and single emotes are equally valid."),
  scheduled("dec-free-secret-santa", "2026-12-22", "December — Holiday Chaos", "🎁 Free Digital Secret Santa", "Gift the group something free: a favorite meme, playlist link, recipe, phone wallpaper, recommendation, or sincere compliment."),
  scheduled("dec-survived", "2026-12-28", "December — Holiday Chaos", "💀 Holiday Debrief", "What worked, what absolutely did not, and what story will become funnier later?"),
  scheduled("jan-pajamas", "2027-01-05", "January — We Survived", "🧸 Discord Pajama Party", "Wear whatever counts as pajamas, bring the snack currently available, and drop a photo, GIF, or status from the couch."),
  scheduled("jan-games", "2027-01-10", "January — We Survived", "🎮 Game Night Drop-In", "Pick a quick group game, share a favorite, or use this thread for asynchronous would-you-rather chaos."),
  scheduled("jan-beverage", "2027-01-15", "January — We Survived", "🥂 BYOB / BYOC / BYOW", "Bring your beverage of choice and tell us what survived the season with you."),
  scheduled("jan-awards", "2027-01-21", "January — We Survived", "🏆 Mom Awards Nominations", "Nominate kind, funny, non-competitive awards: Professional Yapper, Meme Medic, Chaos Correspondent, Cozy MVP—or invent one."),
  scheduled("jan-finale", "2027-01-27", "January — We Survived", "❄️ Fall Into Chaos Finale", "We made it. Share a favorite moment, stamp, photo, story, or simply collect your completely prestigious survival credit."),
].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
