/**
 * Ready-made cards to start from, each a whole card, words and all, without
 * pictures or music. Each has a category, as a card shop sorts its racks, an
 * occasion and a tone, which Browse filters by, and most categories have
 * funny ones beside the heartfelt ones. The app's Browse page and the CLI
 * share them, and a card made from one is an ordinary card, so changing a
 * template later changes no one's card.
 */
import type {
  DesignIdValue,
  EffectIdValue,
  PaletteIdValue,
} from "./registry.ts";
import type { Card } from "./schema.ts";
import type { Tone } from "./shuffle.ts";

export const categories = [
  "Seasonal",
  "Birthdays",
  "Love",
  "Life events",
  "Well done",
  "Thank you",
  "Thinking of you",
  "Just because",
] as const;

export type Category = (typeof categories)[number];

export interface Template {
  /** A short, stable name for agents and links, such as `birthday-confetti`. */
  readonly id: string;
  /** What Browse calls it. */
  readonly name: string;
  readonly category: Category;
  /** How the words read. */
  readonly tone: Tone;
  readonly card: Card;
}

interface Words<Id extends DesignIdValue> {
  readonly occasion: string;
  /** Heartfelt without one. */
  readonly tone?: Tone;
  readonly design: Id;
  readonly palette?: PaletteIdValue<Id>;
  readonly effect: EffectIdValue;
  readonly title: string;
  readonly message: string;
}

const template = <Id extends DesignIdValue>(
  id: string,
  name: string,
  category: Category,
  words: Words<Id>,
): Template => {
  const card = {
    version: 1 as const,
    occasion: words.occasion,
    design: words.design,
    effect: words.effect,
    front: { title: words.title },
    inside: { message: words.message, from: "" },
    media: [],
  };

  const coloured: Card =
    words.palette === undefined ? card : { ...card, palette: words.palette };

  return {
    id,
    name,
    category,
    tone: words.tone ?? "heartfelt",
    card: coloured,
  };
};

export const templates: readonly Template[] = [
  template("christmas-wreath", "Wreath", "Seasonal", {
    occasion: "Christmas",
    design: "christmas",
    effect: "snow",
    title: "Merry Christmas",
    message:
      "Wishing you a warm and happy Christmas, with good food, good company and a bit of peace and quiet. Here's to the year ahead.",
  }),
  template("christmas-greetings", "Season's greetings", "Seasonal", {
    occasion: "Christmas",
    design: "christmas",
    palette: "red",
    effect: "sparkle",
    title: "Season's Greetings",
    message:
      "Thinking of you all this Christmas, and sending love for the New Year.",
  }),
  template("christmas-cosy", "Cosy Christmas", "Seasonal", {
    occasion: "Christmas",
    design: "any",
    palette: "kraft",
    effect: "snow",
    title: "Happy Christmas",
    message: "Hope this Christmas is a cosy one. Lots of love to you all.",
  }),
  template("christmas-sprouts", "Hold the sprouts", "Seasonal", {
    occasion: "Christmas",
    tone: "funny",
    design: "christmas",
    palette: "red",
    effect: "snow",
    title: "Ho Ho Hold the Sprouts",
    message:
      "Wishing you more presents than sprouts and a paper hat that actually fits. Save me a mince pie.",
  }),
  template("christmas-yule", "Yule love this", "Seasonal", {
    occasion: "Christmas",
    tone: "punny",
    design: "christmas",
    palette: "midnight",
    effect: "sparkle",
    title: "Yule Love This",
    message:
      "Sorry, I've been saving that one all year. Snow much love to you all.",
  }),
  template("christmas-board-game", "Board game", "Seasonal", {
    occasion: "Christmas",
    tone: "dry",
    design: "any",
    palette: "white",
    effect: "snow",
    title: "It's Christmas Again",
    message:
      "Another year, another argument about the rules of the board game. Merry Christmas, all the same.",
  }),
  template("new-year", "New Year", "Seasonal", {
    occasion: "New Year",
    design: "any",
    palette: "ink",
    effect: "sparkle",
    title: "Happy New Year",
    message:
      "Here's to a year of good things. Thank you for being part of the last one.",
  }),
  template("new-year-resolutions", "Resolutions", "Seasonal", {
    occasion: "New Year",
    tone: "funny",
    design: "birthday",
    palette: "midnight",
    effect: "confetti",
    title: "New Year, Same Me",
    message:
      "Here's to a year of good intentions, at least until February. Cheers to the next one.",
  }),
  template("easter-sunshine", "Sunshine", "Seasonal", {
    occasion: "Easter",
    tone: "sweet",
    design: "any",
    palette: "sky",
    effect: "sparkle",
    title: "Happy Easter",
    message:
      "Wishing you a lovely Easter, full of sunshine and far too much chocolate.",
  }),
  template("easter-egg", "Egg-cellent", "Seasonal", {
    occasion: "Easter",
    tone: "punny",
    design: "birthday",
    effect: "confetti",
    title: "Have an Egg-cellent Easter",
    message:
      "Hope the Easter bunny is good to you. Don't eat it all at once. Or do.",
  }),
  template("halloween-treats", "Treats", "Seasonal", {
    occasion: "Halloween",
    tone: "funny",
    design: "any",
    palette: "ink",
    effect: "sparkle",
    title: "Happy Halloween",
    message:
      "Wishing you more treats than tricks, and a costume nobody can guess.",
  }),
  template("halloween-fang", "Fang-tastic", "Seasonal", {
    occasion: "Halloween",
    tone: "punny",
    design: "christmas",
    palette: "midnight",
    effect: "sparkle",
    title: "Have a Fang-tastic Halloween",
    message: "Hope it's a scream. Sorry, I had to.",
  }),
  template("mothers-day", "For Mum", "Seasonal", {
    occasion: "Mother's Day",
    design: "anniversary",
    effect: "hearts",
    title: "Happy Mother's Day",
    message:
      "Thank you for everything you do, and everything you've done. Love you, Mum.",
  }),
  template("mothers-day-best", "Best Mum", "Seasonal", {
    occasion: "Mother's Day",
    tone: "funny",
    design: "birthday",
    palette: "blush",
    effect: "confetti",
    title: "World's Best Mum",
    message:
      "Thanks for putting up with me. I know it wasn't always easy. Mostly my fault.",
  }),
  template("fathers-day", "For Dad", "Seasonal", {
    occasion: "Father's Day",
    design: "any",
    palette: "ink",
    effect: "sparkle",
    title: "Happy Father's Day",
    message:
      "Thank you for always being there, and for all the terrible jokes. Love you, Dad.",
  }),
  template("fathers-day-jokes", "Dad jokes", "Seasonal", {
    occasion: "Father's Day",
    tone: "punny",
    design: "any",
    palette: "kraft",
    effect: "confetti",
    title: "Happy Father's Day",
    message:
      "I'd tell you a dad joke, but you've heard them all. You told them to me.",
  }),
  template("birthday-confetti", "Confetti", "Birthdays", {
    occasion: "Birthday",
    design: "birthday",
    effect: "confetti",
    title: "Happy Birthday!",
    message: "Have the best day. You deserve all the cake.",
  }),
  template("birthday-here-is-to-you", "Here's to you", "Birthdays", {
    occasion: "Birthday",
    design: "birthday",
    palette: "midnight",
    effect: "sparkle",
    title: "Here's to You",
    message:
      "Another year older and somehow still getting better. Have a brilliant birthday.",
  }),
  template("birthday-classic", "Classic", "Birthdays", {
    occasion: "Birthday",
    design: "any",
    palette: "sky",
    effect: "confetti",
    title: "Happy Birthday",
    message: "Wishing you a wonderful day and a year full of good things.",
  }),
  template("birthday-belated", "Belated", "Birthdays", {
    occasion: "Birthday",
    design: "birthday",
    palette: "blush",
    effect: "confetti",
    title: "Happy Belated Birthday",
    message:
      "Late, but no less meant. I hope it was a great day and the celebrations are still going.",
  }),
  template("birthday-vintage", "Not old, vintage", "Birthdays", {
    occasion: "Birthday",
    tone: "funny",
    design: "birthday",
    effect: "confetti",
    title: "Not Old, Vintage",
    message:
      "You're not getting older, you're becoming a classic. Eat the cake. All of it. It's the law today.",
  }),
  template("birthday-candles", "Fire brigade", "Birthdays", {
    occasion: "Birthday",
    tone: "cheeky",
    design: "birthday",
    palette: "midnight",
    effect: "confetti",
    title: "Look Who's Older",
    message:
      "Don't worry about the candles, the fire brigade's on standby. Have a great day, and act your age tomorrow.",
  }),
  template("birthday-melon", "One in a melon", "Birthdays", {
    occasion: "Birthday",
    tone: "punny",
    design: "any",
    palette: "sky",
    effect: "sparkle",
    title: "You're One in a Melon",
    message: "Sorry, I couldn't resist. Have a berry happy day.",
  }),
  template("birthday-again", "Again", "Birthdays", {
    occasion: "Birthday",
    tone: "dry",
    design: "any",
    palette: "white",
    effect: "sparkle",
    title: "Happy Birthday, I Suppose",
    message:
      "Another year has passed, as they tend to. Have a reasonably good day.",
  }),
  template("anniversary-rings", "Rings", "Love", {
    occasion: "Anniversary",
    design: "anniversary",
    palette: "navy",
    effect: "hearts",
    title: "Happy Anniversary",
    message: "Another year of you and me. I'd choose you all over again.",
  }),
  template("anniversary-stuck", "Stuck with me", "Love", {
    occasion: "Anniversary",
    tone: "cheeky",
    design: "anniversary",
    effect: "hearts",
    title: "Still Not Sick of You",
    message:
      "Another year and you still laugh at my jokes. Mostly. Love you, even when you steal the duvet.",
  }),
  template("valentine", "Valentine", "Love", {
    occasion: "Valentine's Day",
    design: "anniversary",
    effect: "hearts",
    title: "Be Mine",
    message: "You make every ordinary day better. Happy Valentine's Day.",
  }),
  template("valentine-latte", "A latte", "Love", {
    occasion: "Valentine's Day",
    tone: "punny",
    design: "birthday",
    palette: "blush",
    effect: "hearts",
    title: "I Love You a Latte",
    message: "You make my heart skip a beet. Happy Valentine's Day.",
  }),
  template("engagement", "Engagement", "Love", {
    occasion: "Engagement",
    design: "anniversary",
    palette: "sage",
    effect: "sparkle",
    title: "Congratulations on Your Engagement",
    message:
      "What wonderful news. Wishing you both all the happiness in the world.",
  }),
  template("wedding", "Wedding", "Love", {
    occasion: "Wedding",
    design: "anniversary",
    palette: "sage",
    effect: "sparkle",
    title: "Congratulations on Your Wedding",
    message:
      "Wishing you both a lifetime of love, laughter and adventures together.",
  }),
  template("wedding-remote", "The remote", "Love", {
    occasion: "Wedding",
    tone: "funny",
    design: "any",
    palette: "white",
    effect: "hearts",
    title: "Happily Ever After",
    message:
      "Congratulations on finding someone who'll put up with you forever. Here's to fair turns with the remote.",
  }),
  template("new-home", "New home", "Life events", {
    occasion: "New home",
    design: "any",
    palette: "kraft",
    effect: "sparkle",
    title: "Welcome Home",
    message: "Congratulations on your new home. May it be full of happy times.",
  }),
  template("new-home-boxes", "Boxes", "Life events", {
    occasion: "New home",
    tone: "funny",
    design: "any",
    palette: "white",
    effect: "confetti",
    title: "New Pad, Who Dis?",
    message:
      "May the boxes unpack themselves and the Wi-Fi reach every room. When's the housewarming?",
  }),
  template("new-baby", "New baby", "Life events", {
    occasion: "New baby",
    design: "any",
    palette: "sky",
    effect: "sparkle",
    title: "Hello, Little One",
    message:
      "Congratulations on your beautiful new arrival. Wishing you all lots of love, and some sleep.",
  }),
  template("new-baby-boss", "Tiny boss", "Life events", {
    occasion: "New baby",
    tone: "funny",
    design: "birthday",
    palette: "blush",
    effect: "confetti",
    title: "Welcome to the World",
    message:
      "Congratulations on your new tiny boss. Say goodbye to sleep, and hello to the best thing ever.",
  }),
  template("new-job", "New job", "Life events", {
    occasion: "New job",
    tone: "funny",
    design: "any",
    palette: "sky",
    effect: "confetti",
    title: "Good Luck in the New Job",
    message:
      "They don't know how lucky they are. Try not to eat all the biscuits on day one.",
  }),
  template("leaving", "Leaving", "Life events", {
    occasion: "Leaving",
    tone: "funny",
    design: "any",
    palette: "ink",
    effect: "confetti",
    title: "Sorry You're Leaving",
    message:
      "Who's going to laugh at our jokes now? Good luck with everything, and stay in touch.",
  }),
  template("graduation", "Graduate", "Life events", {
    occasion: "Graduation",
    design: "birthday",
    palette: "midnight",
    effect: "confetti",
    title: "Congratulations, Graduate",
    message: "All that hard work has paid off. So proud of you.",
  }),
  template("retirement", "Gone fishing", "Life events", {
    occasion: "Retirement",
    tone: "funny",
    design: "any",
    palette: "kraft",
    effect: "confetti",
    title: "Gone Fishing",
    message:
      "No more alarms, no more meetings, no more pretending to like spreadsheets. Enjoy every minute.",
  }),
  template("retirement-next", "What's next", "Life events", {
    occasion: "Retirement",
    design: "anniversary",
    palette: "navy",
    effect: "sparkle",
    title: "Happy Retirement",
    message:
      "Congratulations on a wonderful career. Enjoy everything that comes next.",
  }),
  template("congratulations", "Well done", "Well done", {
    occasion: "Congratulations",
    design: "birthday",
    palette: "midnight",
    effect: "confetti",
    title: "Congratulations!",
    message: "You did it! So proud of you. Time to celebrate.",
  }),
  template("congratulations-did-a-thing", "Did a thing", "Well done", {
    occasion: "Congratulations",
    tone: "funny",
    design: "birthday",
    effect: "confetti",
    title: "You Did a Thing!",
    message:
      "Look at you, being all impressive. Time to celebrate. Drinks are on you.",
  }),
  template("congratulations-annoying", "Annoyingly good", "Well done", {
    occasion: "Congratulations",
    tone: "dry",
    design: "any",
    palette: "white",
    effect: "sparkle",
    title: "Not Bad at All",
    message:
      "You've done rather well, which is very annoying. Well done. I'm proud of you, don't tell anyone.",
  }),
  template("exams", "Exams", "Well done", {
    occasion: "Exams",
    tone: "cheeky",
    design: "birthday",
    effect: "confetti",
    title: "You Passed!",
    message:
      "I never doubted you for a second. Well, maybe a second. Congratulations!",
  }),
  template("good-luck", "Good luck", "Well done", {
    occasion: "Good luck",
    design: "any",
    palette: "sky",
    effect: "sparkle",
    title: "Good Luck",
    message: "You've got this. Thinking of you and keeping everything crossed.",
  }),
  template("thank-you", "Thank you", "Thank you", {
    occasion: "Thank you",
    design: "any",
    effect: "sparkle",
    title: "Thank You",
    message: "Thank you so much. It really meant a lot, and I won't forget it.",
  }),
  template("thank-you-everything", "For everything", "Thank you", {
    occasion: "Thank you",
    design: "birthday",
    palette: "blush",
    effect: "confetti",
    title: "Thank You for Everything",
    message:
      "Thank you for all your patience, help and encouragement. It made all the difference.",
  }),
  template("thank-you-latte", "Thanks a latte", "Thank you", {
    occasion: "Thank you",
    tone: "punny",
    design: "any",
    palette: "kraft",
    effect: "sparkle",
    title: "Thanks a Latte",
    message: "You really bean there for me. Thank you so much.",
  }),
  template("thank-you-biscuit", "A biscuit", "Thank you", {
    occasion: "Thank you",
    tone: "funny",
    design: "birthday",
    effect: "confetti",
    title: "You're a Legend",
    message:
      "Thank you. I owe you one, and possibly a biscuit. Cheers, you star.",
  }),
  template("thank-you-teacher", "Teacher", "Thank you", {
    occasion: "Thank you teacher",
    tone: "sweet",
    design: "any",
    palette: "sky",
    effect: "sparkle",
    title: "Thank You, Teacher",
    message:
      "Thank you for a brilliant year, and for all your patience. You made learning fun.",
  }),
  template("get-well", "Get well", "Thinking of you", {
    occasion: "Get well",
    design: "any",
    palette: "sky",
    effect: "sparkle",
    title: "Get Well Soon",
    message:
      "Sorry to hear you're under the weather. Rest up, and I hope you're feeling better very soon.",
  }),
  template("get-well-biscuits", "Biscuits", "Thinking of you", {
    occasion: "Get well",
    tone: "funny",
    design: "any",
    palette: "sky",
    effect: "sparkle",
    title: "Feel Better Soon",
    message:
      "I hear the best medicine is laughter, but biscuits are a close second. Hurry up and get better, we miss you.",
  }),
  template("thinking-of-you", "Thinking of you", "Thinking of you", {
    occasion: "Thinking of you",
    design: "anniversary",
    palette: "sage",
    effect: "none",
    title: "Thinking of You",
    message: "Just a little note to say I'm thinking of you.",
  }),
  template("sending-a-hug", "A hug", "Thinking of you", {
    occasion: "Thinking of you",
    tone: "sweet",
    design: "anniversary",
    palette: "blush",
    effect: "hearts",
    title: "Sending a Hug",
    message: "Here's a hug in card form. Hope you're doing OK. Lots of love.",
  }),
  template("sorry", "Sorry", "Thinking of you", {
    occasion: "Sorry",
    tone: "sweet",
    design: "anniversary",
    palette: "blush",
    effect: "hearts",
    title: "I'm Sorry",
    message: "I got it wrong, and I'm sorry. Can we start again?",
  }),
  template("sympathy", "With sympathy", "Thinking of you", {
    occasion: "Sympathy",
    design: "any",
    effect: "none",
    title: "With Sympathy",
    message:
      "Thinking of you and sending all my love. I'm here whenever you need me.",
  }),
  template("just-because", "Just because", "Just because", {
    occasion: "Just because",
    tone: "sweet",
    design: "any",
    effect: "sparkle",
    title: "Just Because",
    message: "No special reason. Just wanted to say you're brilliant.",
  }),
  template("just-because-post", "Not a bill", "Just because", {
    occasion: "Just because",
    tone: "funny",
    design: "birthday",
    palette: "blush",
    effect: "confetti",
    title: "Hello, You",
    message:
      "No reason. I just thought you'd like some post that isn't a bill. Have a lovely day.",
  }),
  template("just-because-friend", "Friend", "Just because", {
    occasion: "Friendship",
    design: "any",
    palette: "kraft",
    effect: "sparkle",
    title: "Thanks for Being You",
    message:
      "Just wanted to say how glad I am to have you around. Here's to many more years of nonsense.",
  }),
];

/** The template with this id, if there is one. */
export const templateById = (id: string) =>
  templates.find((each) => each.id === id);
