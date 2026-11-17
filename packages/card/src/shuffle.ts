/**
 * Shuffle: a whole card made at random from what suits an occasion, with no
 * AI anywhere. Each occasion has the designs, colourways and effects that fit
 * it, and words in a few tones: titles, an opening line and a closing line,
 * which mix into a message. The app's Shuffle and the CLI's `card shuffle`
 * both use it.
 */
import { Array as Arr, Effect, Random } from "effect";
import type {
  DesignIdValue,
  EffectIdValue,
  PaletteIdValue,
} from "./registry.ts";
import type { Card } from "./schema.ts";

export const tones = [
  "funny",
  "cheeky",
  "punny",
  "dry",
  "heartfelt",
  "sweet",
] as const;

export type Tone = (typeof tones)[number];

export const toneNames = {
  funny: "Funny",
  cheeky: "Cheeky",
  punny: "Punny",
  dry: "Dry",
  heartfelt: "Heartfelt",
  sweet: "Sweet",
} as const satisfies { readonly [Id in Tone]: string };

type Some<A> = Arr.NonEmptyReadonlyArray<A>;

interface Words {
  readonly titles: Some<string>;
  readonly openers: Some<string>;
  readonly closers: Some<string>;
}

interface OccasionWords extends Partial<Record<Tone, Words>> {
  /** Every occasion can be heartfelt, so a tone it lacks falls back to it. */
  readonly heartfelt: Words;
}

interface Look {
  readonly design: DesignIdValue;
  readonly palette?: string;
}

interface Occasion {
  readonly name: string;
  /** Whether what someone typed as the occasion means this one. */
  readonly matches: RegExp;
  /** Whether Shuffle picks it without being asked, which a sad one isn't. */
  readonly random: boolean;
  readonly looks: Some<Look>;
  readonly effects: Some<EffectIdValue>;
  readonly words: OccasionWords;
}

const look = <Id extends DesignIdValue>(
  design: Id,
  palette?: PaletteIdValue<Id>,
): Look => (palette === undefined ? { design } : { design, palette });

const words = (
  titles: Some<string>,
  openers: Some<string>,
  closers: Some<string>,
): Words => ({ titles, openers, closers });

const justBecause: Occasion = {
  name: "Just because",
  matches: /just because|no reason/iu,
  random: true,
  looks: [look("any"), look("any", "sky"), look("birthday", "blush")],
  effects: ["sparkle", "confetti"],
  words: {
    funny: words(
      ["Just Because", "Hello, You"],
      [
        "No reason. I just thought you'd like some post that isn't a bill.",
        "This card is to remind you that you're great. You're welcome.",
      ],
      ["Have a lovely day.", "Speak soon."],
    ),
    heartfelt: words(
      ["Just Because", "Thinking of You"],
      [
        "Just wanted to say how glad I am to have you around.",
        "No special reason, just sending a little love your way.",
      ],
      ["Have a lovely day.", "Speak soon."],
    ),
    sweet: words(
      ["Hello, Lovely", "Just Because"],
      [
        "You make the world a little brighter.",
        "Here's a little something to make you smile.",
      ],
      ["Lots of love.", "Have the best day."],
    ),
  },
};

export const occasions: Some<Occasion> = [
  {
    name: "New Year",
    matches: /new year|hogmanay/iu,
    random: true,
    looks: [
      look("any", "ink"),
      look("birthday", "midnight"),
      look("christmas", "midnight"),
    ],
    effects: ["sparkle", "confetti"],
    words: {
      funny: words(
        ["Happy New Year", "New Year, Same Me"],
        [
          "Here's to a year of good intentions, at least until February.",
          "May your resolutions last longer than the leftover chocolates.",
        ],
        ["Happy New Year!", "Cheers to the next one."],
      ),
      heartfelt: words(
        ["Happy New Year", "Here's to the Year Ahead"],
        [
          "Thank you for being part of the last year.",
          "Wishing you a year full of good things and good people.",
        ],
        ["Here's to the next twelve months.", "Happy New Year, with love."],
      ),
    },
  },
  {
    name: "Christmas",
    matches: /christmas|xmas|festive/iu,
    random: true,
    looks: [
      look("christmas"),
      look("christmas", "red"),
      look("christmas", "midnight"),
      look("any", "kraft"),
    ],
    effects: ["snow", "sparkle"],
    words: {
      funny: words(
        [
          "Merry Christmas",
          "Eat, Drink and Be Merry",
          "Ho Ho Hold the Sprouts",
        ],
        [
          "Wishing you more presents than sprouts and a paper hat that actually fits.",
          "May your turkey be moist and your relatives be brief.",
          "I checked, and you're on the nice list. Just about.",
        ],
        [
          "Have a cracking Christmas.",
          "Save me a mince pie.",
          "Good luck with the washing up.",
        ],
      ),
      cheeky: words(
        ["Nice List (Just About)", "Merry Christmas, You"],
        [
          "Santa says you were mostly good this year. I didn't tell him everything.",
          "Here's to too much food, too much telly and not nearly enough naps.",
        ],
        [
          "Have a very merry one.",
          "Don't eat all the chocolates. Actually, do.",
        ],
      ),
      punny: words(
        ["Yule Love This", "Season's Eatings", "Have a Cracking Christmas"],
        [
          "Sorry, I've been saving that one all year.",
          "Wishing you a very merry Christmas, and a pudding with your name on it.",
        ],
        ["Have an elf of a time.", "Snow much love to you all."],
      ),
      dry: words(
        ["It's Christmas Again", "Seasonal Greetings, as Required"],
        [
          "It's that time of year when we eat chocolate for breakfast and call it tradition.",
          "Another year, another argument about the rules of the board game.",
        ],
        ["Merry Christmas, all the same.", "Do try to enjoy it."],
      ),
      heartfelt: words(
        ["Merry Christmas", "Season's Greetings", "Happy Christmas"],
        [
          "Wishing you a warm and happy Christmas with the people you love.",
          "Thinking of you this Christmas and sending lots of love.",
        ],
        [
          "Here's to a wonderful New Year.",
          "Have a peaceful and happy holiday.",
        ],
      ),
    },
  },
  {
    name: "Easter",
    matches: /easter/iu,
    random: true,
    looks: [look("any", "sky"), look("birthday"), look("birthday", "blush")],
    effects: ["sparkle", "confetti"],
    words: {
      punny: words(
        ["Have an Egg-cellent Easter", "Hoppy Easter"],
        [
          "Hope the Easter bunny is good to you.",
          "Wishing you an egg-stra special Easter.",
        ],
        ["Don't eat it all at once. Or do.", "Happy Easter!"],
      ),
      sweet: words(
        ["Happy Easter", "Spring Has Sprung"],
        [
          "Wishing you a lovely Easter, full of sunshine.",
          "Sending a little spring sunshine your way.",
        ],
        ["Enjoy the chocolate.", "Lots of love."],
      ),
      heartfelt: words(
        ["Happy Easter", "Easter Wishes"],
        [
          "Wishing you a peaceful and happy Easter.",
          "Thinking of you all this Easter.",
        ],
        ["With love.", "Have a wonderful weekend."],
      ),
    },
  },
  {
    name: "Halloween",
    matches: /hallowe'?en|spooky/iu,
    random: true,
    looks: [look("any", "ink"), look("christmas", "midnight")],
    effects: ["sparkle"],
    words: {
      funny: words(
        ["Happy Halloween", "Boo!"],
        [
          "Wishing you more treats than tricks.",
          "May your costume be scary and your sweets be plentiful.",
        ],
        ["Don't eat them all tonight.", "Have a spooky one."],
      ),
      punny: words(
        ["Have a Fang-tastic Halloween", "Happy Howl-oween"],
        ["Hope it's a scream.", "You're my boo."],
        ["Sorry, I had to.", "Have a spook-tacular night."],
      ),
      heartfelt: words(
        ["Happy Halloween"],
        ["Wishing you a fun and spooky Halloween."],
        ["Have a great night."],
      ),
    },
  },
  {
    name: "Mother's Day",
    matches: /mother'?s day|mothering sunday/iu,
    random: true,
    looks: [
      look("anniversary"),
      look("birthday", "blush"),
      look("anniversary", "sage"),
    ],
    effects: ["hearts", "sparkle"],
    words: {
      funny: words(
        ["World's Best Mum", "Happy Mother's Day"],
        [
          "Thanks for putting up with me. I know it wasn't always easy.",
          "You're the best mum ever, and I'm not just saying that because you'll read this.",
        ],
        ["Mostly my fault.", "Love you, Mum."],
      ),
      heartfelt: words(
        ["Happy Mother's Day", "For Mum"],
        [
          "Thank you for everything you do, and everything you've done.",
          "I'm so lucky to have you.",
        ],
        ["Love you, Mum.", "With all my love."],
      ),
      sweet: words(
        ["Happy Mother's Day", "Love You, Mum"],
        ["You make everything better.", "Thank you for being you."],
        ["Lots of love.", "Have a lovely day, Mum."],
      ),
    },
  },
  {
    name: "Father's Day",
    matches: /father'?s day/iu,
    random: true,
    looks: [
      look("any", "ink"),
      look("any", "kraft"),
      look("anniversary", "navy"),
    ],
    effects: ["sparkle", "confetti"],
    words: {
      funny: words(
        ["Happy Father's Day", "World's Okayest Dad"],
        [
          "Thank you for all the terrible jokes. Some of them were nearly funny.",
          "I'd tell you a dad joke, but you've heard them all. You told them to me.",
        ],
        ["Love you, Dad.", "Enjoy your day off from the barbecue."],
      ),
      dry: words(
        ["Happy Father's Day", "It's Your Day, Apparently"],
        [
          "I'm told it's Father's Day, so here's a card.",
          "Thank you for everything. There, I said it.",
        ],
        ["Love you, Dad.", "Enjoy it."],
      ),
      heartfelt: words(
        ["Happy Father's Day", "For Dad"],
        [
          "Thank you for always being there.",
          "Everything I know about being kind, I learned from you.",
        ],
        ["Love you, Dad.", "With all my love."],
      ),
    },
  },
  {
    name: "Birthday",
    matches: /birthday|bday|\b\d+(?:st|nd|rd|th)\b/iu,
    random: true,
    looks: [
      look("birthday"),
      look("birthday", "blush"),
      look("birthday", "midnight"),
      look("any", "sky"),
    ],
    effects: ["confetti", "sparkle"],
    words: {
      funny: words(
        [
          "Happy Birthday, Legend",
          "Another Lap Around the Sun",
          "Not Old, Vintage",
        ],
        [
          "You're not getting older, you're becoming a classic.",
          "Statistically, people who have more birthdays live longer, so keep going.",
          "I was going to bake you a cake, but we both know how that would have ended.",
        ],
        [
          "Eat the cake. All of it. It's the law today.",
          "Have a brilliant day, and an even better slice of cake.",
          "Here's to another year of being fabulous and slightly chaotic.",
        ],
      ),
      cheeky: words(
        ["Look Who's Older", "Still Got It (Mostly)"],
        [
          "Don't worry about the candles, the fire brigade's on standby.",
          "You don't look a day over fabulous. A few days over, maybe.",
          "Age is just a number. In your case, quite a big one.",
        ],
        [
          "Have one for me. Or three.",
          "Enjoy it, you've earned every wrinkle.",
          "Have a great day, and act your age tomorrow.",
        ],
      ),
      punny: words(
        [
          "Have a Grate Birthday",
          "You're One in a Melon",
          "Orange You Glad It's Your Birthday?",
        ],
        [
          "I'd tell you a birthday joke, but it'd only take the cake.",
          "You're simply the zest.",
          "Sorry, I couldn't resist.",
        ],
        ["Have a berry happy day.", "Wishing you a sweet year ahead."],
      ),
      dry: words(
        ["Happy Birthday, I Suppose", "Well, That Happened Again"],
        [
          "Another year has passed, as they tend to.",
          "Congratulations on going round the Sun once more.",
        ],
        [
          "Have a reasonably good day.",
          "Try to enjoy it, it's only once a year.",
        ],
      ),
      heartfelt: words(
        ["Happy Birthday", "Here's to You", "Wishing You the Best"],
        [
          "I hope today is full of the people and things you love most.",
          "Another year of you, which is always worth celebrating.",
          "Thank you for being such a big part of my life.",
        ],
        [
          "Wishing you a wonderful year ahead.",
          "Have the loveliest day.",
          "Here's to all the good things still to come.",
        ],
      ),
    },
  },
  {
    name: "Anniversary",
    matches: /anniversary/iu,
    random: true,
    looks: [
      look("anniversary"),
      look("anniversary", "navy"),
      look("anniversary", "sage"),
    ],
    effects: ["hearts", "sparkle"],
    words: {
      funny: words(
        ["Still Not Sick of You", "Happy Anniversary"],
        [
          "Another year and you still laugh at my jokes. Mostly.",
          "You're the only person I'd share my chips with. Most of them.",
        ],
        [
          "Happy anniversary.",
          "Here's to many more years of putting up with me.",
        ],
      ),
      cheeky: words(
        ["You're Stuck With Me", "Another Year, No Refunds"],
        ["Thanks for not running off yet.", "I'd still swipe right."],
        [
          "Love you, even when you steal the duvet.",
          "Happy anniversary, gorgeous.",
        ],
      ),
      heartfelt: words(
        ["Happy Anniversary", "Another Year of Us"],
        [
          "Another year of you and me, and I'd choose you all over again.",
          "Every year with you is my favourite one so far.",
        ],
        ["Here's to all the years to come.", "All my love, always."],
      ),
      sweet: words(
        ["Happy Anniversary", "You and Me"],
        ["You're still my favourite person.", "Life is better with you in it."],
        ["Love you lots.", "Here's to us."],
      ),
    },
  },
  {
    name: "Valentine's Day",
    matches: /valentine/iu,
    random: true,
    looks: [
      look("anniversary"),
      look("anniversary", "navy"),
      look("birthday", "blush"),
    ],
    effects: ["hearts"],
    words: {
      funny: words(
        ["Be Mine", "You'll Do"],
        [
          "Roses are red, violets are blue, I'm rubbish at poems, but I do love you.",
          "You're the cheese to my toastie.",
        ],
        [
          "Happy Valentine's Day.",
          "Be my Valentine? You don't really have a choice.",
        ],
      ),
      punny: words(
        ["I Love You a Latte", "We're a Perfect Pear", "You're Tea-riffic"],
        ["Sorry, I couldn't resist.", "You make my heart skip a beet."],
        ["Happy Valentine's Day.", "Love you, sweet pea."],
      ),
      heartfelt: words(
        ["Be Mine", "Happy Valentine's Day"],
        ["You make every ordinary day better.", "I'm so lucky to have you."],
        ["Happy Valentine's Day.", "All my love."],
      ),
      sweet: words(
        ["Be Mine", "You're My Favourite"],
        ["You make my heart happy.", "Every day with you is the best one."],
        ["Love you lots.", "Happy Valentine's Day, sweetheart."],
      ),
    },
  },
  {
    name: "Wedding",
    matches: /wedding|married|engage/iu,
    random: true,
    looks: [
      look("anniversary", "sage"),
      look("anniversary"),
      look("any", "white"),
    ],
    effects: ["sparkle", "hearts"],
    words: {
      funny: words(
        ["Congratulations, You Two", "Happily Ever After"],
        [
          "Congratulations on finding the one person who laughs at your jokes.",
          "Congratulations on finding someone who'll put up with you forever.",
        ],
        [
          "Wishing you a lifetime of love and laughter.",
          "Here's to happily ever after, and fair turns with the remote.",
        ],
      ),
      heartfelt: words(
        [
          "Congratulations on Your Wedding",
          "Just Married",
          "To the Happy Couple",
        ],
        [
          "Wishing you both a lifetime of love, laughter and adventures together.",
          "What a joy to see you two so happy.",
        ],
        [
          "Congratulations, with all our love.",
          "Here's to the start of something wonderful.",
        ],
      ),
    },
  },
  {
    name: "Congratulations",
    matches: /congrat|well done|promot|exam|graduat|passed/iu,
    random: true,
    looks: [look("birthday", "midnight"), look("birthday"), look("any", "sky")],
    effects: ["confetti", "sparkle"],
    words: {
      funny: words(
        ["You Did a Thing!", "Look at You Go"],
        [
          "Look at you, being all impressive.",
          "I always knew you'd make it. I'd have said that either way, but still.",
        ],
        [
          "Congratulations, you absolute star.",
          "Time to celebrate. Drinks are on you.",
        ],
      ),
      punny: words(
        ["You Nailed It", "Way to Grow", "You're on a Roll"],
        [
          "Turns out you're a natural.",
          "Seriously, you should be proud of yourself.",
        ],
        ["Congratulations!", "Let's celebrate soon."],
      ),
      dry: words(
        ["Well Done, I Suppose", "Not Bad at All"],
        [
          "I'm told this is a big deal.",
          "You've done rather well, which is very annoying.",
        ],
        [
          "Congratulations, genuinely.",
          "Well done. I'm proud of you, don't tell anyone.",
        ],
      ),
      heartfelt: words(
        ["Congratulations!", "Well Done"],
        [
          "You did it, and you deserve every bit of it.",
          "All that hard work has paid off.",
        ],
        ["So proud of you.", "Time to celebrate."],
      ),
    },
  },
  {
    name: "New home",
    matches: /new home|house|moving|new flat|new place/iu,
    random: true,
    looks: [look("any", "kraft"), look("any", "white"), look("any", "sky")],
    effects: ["sparkle", "confetti"],
    words: {
      funny: words(
        ["New Pad, Who Dis?", "Home Sweet Home"],
        [
          "May the boxes unpack themselves and the Wi-Fi reach every room.",
          "Congratulations on your new home and your new collection of flat-pack furniture.",
        ],
        ["Enjoy the new place.", "When's the housewarming?"],
      ),
      dry: words(
        ["You've Moved", "New House, Same You"],
        [
          "Congratulations on your new collection of walls.",
          "I hear the kettle's the first thing to unpack.",
        ],
        ["Enjoy it.", "I'll bring biscuits."],
      ),
      heartfelt: words(
        ["Welcome Home", "Happy New Home"],
        [
          "Congratulations on your new home.",
          "Wishing you lots of happy times in your new place.",
        ],
        ["May it be full of love and laughter.", "Here's to new beginnings."],
      ),
    },
  },
  {
    name: "New baby",
    matches: /baby|newborn|arrival/iu,
    random: true,
    looks: [
      look("any", "sky"),
      look("birthday", "blush"),
      look("any", "white"),
    ],
    effects: ["sparkle"],
    words: {
      funny: words(
        ["Hello, Little One", "Welcome to the World"],
        [
          "Congratulations on your new tiny boss.",
          "Say goodbye to sleep, and hello to the best thing ever.",
        ],
        [
          "Wishing you all lots of love, and some sleep.",
          "Congratulations to you all.",
        ],
      ),
      sweet: words(
        ["Hello, Little One", "Welcome, Baby"],
        [
          "Congratulations on your beautiful new arrival.",
          "What wonderful news.",
        ],
        ["Wishing you all so much love.", "Enjoy every tiny moment."],
      ),
      heartfelt: words(
        ["Congratulations", "Welcome to the World"],
        [
          "Congratulations on your new arrival.",
          "What a special time for you all.",
        ],
        ["Wishing you all lots of love.", "So happy for you."],
      ),
    },
  },
  {
    name: "Thank you",
    matches: /thank/iu,
    random: true,
    looks: [look("any"), look("birthday", "blush"), look("any", "kraft")],
    effects: ["sparkle", "confetti"],
    words: {
      funny: words(
        ["You're a Legend", "Thanks a Million"],
        [
          "Thank you. I owe you one, and possibly a biscuit.",
          "You're the best, and I'm only slightly saying that because you helped me.",
        ],
        ["Thank you so much.", "Cheers, you star."],
      ),
      punny: words(
        ["Thanks a Latte", "Thank You Berry Much", "You're Tea-riffic"],
        ["You really bean there for me.", "What a sweet thing to do."],
        ["Thank you so much.", "I really appreciate it."],
      ),
      dry: words(
        ["Thanks, Then", "Much Obliged"],
        [
          "I'm told it's polite to say thank you, and in this case I mean it.",
          "You helped, and I noticed.",
        ],
        ["Thank you.", "Consider this a formal thank you."],
      ),
      heartfelt: words(
        ["Thank You", "Thank You for Everything"],
        [
          "Thank you so much. It really meant a lot.",
          "I couldn't have done it without you.",
        ],
        ["I won't forget it.", "Thank you, truly."],
      ),
    },
  },
  {
    name: "Get well",
    matches: /get well|poorly|\bill\b|recover|operation|surgery/iu,
    random: true,
    looks: [look("any", "sky"), look("anniversary", "sage")],
    effects: ["sparkle", "none"],
    words: {
      funny: words(
        ["Get Well Soon", "Feel Better Soon"],
        [
          "Sorry you're poorly. Take it easy, watch something terrible, and let everyone bring you snacks.",
          "I hear the best medicine is laughter, but biscuits are a close second.",
        ],
        ["Get well soon.", "Hurry up and get better, we miss you."],
      ),
      heartfelt: words(
        ["Get Well Soon", "Thinking of You"],
        [
          "Sorry to hear you're under the weather.",
          "Sending lots of love and good wishes your way.",
        ],
        [
          "Rest up, and I hope you're feeling better very soon.",
          "Take care of yourself.",
        ],
      ),
    },
  },
  {
    name: "Retirement",
    matches: /retir/iu,
    random: true,
    looks: [look("any", "kraft"), look("birthday", "midnight")],
    effects: ["confetti", "sparkle"],
    words: {
      funny: words(
        ["Happy Retirement", "Gone Fishing"],
        [
          "No more alarms, no more meetings, no more pretending to like spreadsheets.",
          "Now you can finally do all the things you said you'd do when you had time.",
        ],
        ["Enjoy every minute.", "Congratulations on your retirement."],
      ),
      dry: words(
        ["Finally", "You're Free"],
        [
          "After all these years, you get to stop.",
          "The office will be quieter without you. Possibly too quiet.",
        ],
        ["Enjoy it, you've earned it.", "Happy retirement."],
      ),
      heartfelt: words(
        ["Happy Retirement", "Here's to What's Next"],
        [
          "Congratulations on a wonderful career.",
          "You'll be missed, but you've more than earned this.",
        ],
        [
          "Wishing you a long and happy retirement.",
          "Enjoy everything that comes next.",
        ],
      ),
    },
  },
  {
    name: "Leaving",
    matches: /leaving|farewell|new job|goodbye/iu,
    random: true,
    looks: [look("any", "ink"), look("birthday")],
    effects: ["confetti"],
    words: {
      funny: words(
        ["Sorry You're Leaving", "Traitor!"],
        [
          "Who's going to laugh at our jokes now?",
          "We'll miss you, and the biscuits you brought in.",
        ],
        ["Good luck in the new job.", "Stay in touch, or we'll find you."],
      ),
      dry: words(
        ["So You're Off, Then", "Goodbye and Good Luck"],
        [
          "It's been a pleasure, mostly.",
          "The place won't be the same, which is probably for the best.",
        ],
        ["Best of luck.", "Do keep in touch."],
      ),
      heartfelt: words(
        ["Good Luck", "We'll Miss You"],
        [
          "It's been a real pleasure working with you.",
          "You'll be missed by everyone here.",
        ],
        ["Good luck with everything that comes next.", "Stay in touch."],
      ),
    },
  },
  {
    name: "Good luck",
    matches: /good luck|interview|driving test|big day/iu,
    random: true,
    looks: [look("any", "sky"), look("birthday", "midnight")],
    effects: ["sparkle"],
    words: {
      funny: words(
        ["Good Luck!", "Go Get 'Em"],
        [
          "You've got this. And if you haven't, you're very good at pretending.",
          "Break a leg. Not literally.",
        ],
        ["Fingers crossed.", "Go and smash it."],
      ),
      heartfelt: words(
        ["Good Luck", "You've Got This"],
        [
          "Thinking of you and keeping everything crossed.",
          "I believe in you, whatever happens.",
        ],
        ["Good luck.", "So proud of you already."],
      ),
    },
  },
  {
    name: "Sorry",
    matches: /\bsorry\b|apolog/iu,
    random: false,
    looks: [look("anniversary"), look("any", "sky")],
    effects: ["hearts", "none"],
    words: {
      funny: words(
        ["Oops", "My Bad"],
        [
          "I messed up. In my defence, I'm an idiot.",
          "Sorry. I've written it down, so it's official.",
        ],
        ["Forgive me?", "Can we start again?"],
      ),
      heartfelt: words(
        ["I'm Sorry", "Sorry"],
        ["I got it wrong, and I'm sorry.", "I didn't mean to upset you."],
        ["Can we start again?", "I hope you can forgive me."],
      ),
      sweet: words(
        ["I'm Sorry"],
        ["Sorry for being a pain.", "You deserve better from me."],
        ["Lots of love.", "Hug?"],
      ),
    },
  },
  {
    name: "Sympathy",
    matches: /sympathy|condolence|loss|passed away|funeral/iu,
    random: false,
    looks: [look("any"), look("anniversary", "sage")],
    effects: ["none"],
    words: {
      heartfelt: words(
        ["With Sympathy", "Thinking of You"],
        [
          "I'm so sorry for your loss.",
          "Thinking of you and sending all my love.",
        ],
        ["I'm here whenever you need me.", "With love and deepest sympathy."],
      ),
    },
  },
  {
    name: "Thinking of you",
    matches: /thinking of you|hard time|tough time/iu,
    random: false,
    looks: [look("anniversary", "sage"), look("any", "sky")],
    effects: ["none", "sparkle"],
    words: {
      heartfelt: words(
        ["Thinking of You", "Sending Love"],
        [
          "Just a little note to say I'm thinking of you.",
          "I know things are hard right now.",
        ],
        ["I'm here whenever you need me.", "Sending you all my love."],
      ),
      sweet: words(
        ["Thinking of You", "Sending a Hug"],
        [
          "Just wanted to send a little bit of sunshine your way.",
          "Here's a hug in card form.",
        ],
        ["Hope you're doing OK.", "Lots of love."],
      ),
    },
  },
  justBecause,
];

/** The occasions Shuffle knows, by name, such as `Birthday`. */
export const occasionNames = occasions.map((each) => each.name);

export interface ShuffleOptions {
  /**
   * What it's for, as someone typed it, such as `Mum's 60th`. It's kept as
   * the card's occasion, and picks the words when Shuffle knows what it
   * means; without it any cheerful occasion will do.
   */
  readonly occasion?: string;
  /** How the words read; any the occasion has without it. */
  readonly tone?: Tone;
}

export interface Shuffled {
  readonly card: Card;
  /** The tone the words came out in, which is the one asked for if it fits. */
  readonly tone: Tone;
}

const hasTone = (tone: Tone | undefined) => (occasion: Occasion) =>
  tone === undefined || occasion.words[tone] !== undefined;

/** A whole card, picked at random from what suits the occasion. */
export const shuffleCard = Effect.fnUntraced(function* (
  options: ShuffleOptions = {},
) {
  const typed = options.occasion?.trim() ?? "";

  const known =
    typed === ""
      ? undefined
      : (occasions.find((each) => each.matches.test(typed)) ?? justBecause);

  const pool = occasions.filter(
    (each) => each.random && hasTone(options.tone)(each),
  );

  const occasion =
    known ??
    (Arr.isReadonlyArrayNonEmpty(pool)
      ? yield* Random.choice(pool)
      : justBecause);

  const own = tones.filter((tone) => occasion.words[tone] !== undefined);
  const asked = options.tone;

  const tone =
    asked !== undefined && own.includes(asked)
      ? asked
      : Arr.isReadonlyArrayNonEmpty(own)
        ? yield* Random.choice(own)
        : "heartfelt";

  const said = occasion.words[tone] ?? occasion.words.heartfelt;
  const { design, palette } = yield* Random.choice(occasion.looks);
  const opener = yield* Random.choice(said.openers);
  const closer = yield* Random.choice(said.closers);

  const card = {
    version: 1 as const,
    occasion: typed === "" ? occasion.name : typed,
    design,
    effect: yield* Random.choice(occasion.effects),
    front: { title: yield* Random.choice(said.titles) },
    inside: { message: `${opener} ${closer}`, from: "" },
    media: [],
  };

  const shuffled: Card = palette === undefined ? card : { ...card, palette };

  return { card: shuffled, tone } satisfies Shuffled;
});
