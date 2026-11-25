/**
 * Retrieval lab data. Everything here is original and synthetic.
 *
 * "Elmbrook" is a fictional town. The documents imitate the kind of short
 * public-service pages a local council might publish; they describe no real
 * place, organisation or policy. Fees and timings are invented.
 */

export interface Doc {
  id: string;
  title: string;
  text: string;
}

export interface LabQuestion {
  id: string;
  text: string;
  /** Document ids a person would accept as the right source. */
  relevant: string[];
  /** Optional authored context shown under the computed explanation. */
  note?: string;
}

export interface SynonymRule {
  id: string;
  /** Word as a visitor might type it. */
  from: string;
  /** Words the documents tend to use instead. */
  to: string[];
}

export const corpus: Doc[] = [
  {
    id: "D01",
    title: "Household waste and recycling collection",
    text: "Refuse and recycling are collected on alternate weeks. Leave your waste container at the kerb by 7 am on your collection day. Garden waste is collected monthly from April to October.",
  },
  {
    id: "D02",
    title: "Report a missed collection",
    text: "If your waste was not collected on the scheduled day, report a missed collection within two working days. Crews return within three working days of the report.",
  },
  {
    id: "D03",
    title: "Bulky item collection",
    text: "Furniture, mattresses and large appliances can be collected from your home. The charge is 25 per load of up to five items. Book at least five days ahead.",
  },
  {
    id: "D04",
    title: "Report a pothole or road defect",
    text: "Report potholes, sunken drains and damaged road surfaces online. Inspectors assess each report within 48 hours, and urgent defects are made safe within 24 hours.",
  },
  {
    id: "D05",
    title: "Residential parking permits",
    text: "Residents in a controlled parking zone can apply for a permit for each vehicle registered at their address. They carry an annual charge and must be displayed in the windscreen.",
  },
  {
    id: "D06",
    title: "Street trading licence",
    text: "Market stalls, food vans and other mobile traders need a street trading licence before trading on public land. Each application is decided within 28 days.",
  },
  {
    id: "D07",
    title: "Premises licence for selling alcohol",
    text: "Selling alcohol to the public requires a premises licence and a named supervisor who holds a personal licence. Applications are advertised for 28 days for public comment.",
  },
  {
    id: "D08",
    title: "Planning permission for home alterations",
    text: "Extensions, loft conversions, new driveways and front boundary walls may need planning permission. Check the guidance or ask for pre-application advice before building work starts.",
  },
  {
    id: "D09",
    title: "Library membership",
    text: "Membership is free for anyone who lives, works or studies in Elmbrook. Children under 16 need a parent or guardian to sign the application form.",
  },
  {
    id: "D10",
    title: "Borrowing, renewals and overdue items",
    text: "Books can be borrowed for three weeks and renewed twice. Overdue items borrowed on a child account have no charge. Adult accounts pay 20p per item per day.",
  },
  {
    id: "D11",
    title: "Council tax discounts",
    text: "A single occupant receives a 25 percent discount on council tax. Full-time students and carers may be disregarded when counting adults in a home.",
  },
  {
    id: "D12",
    title: "Dog fouling and responsible walking",
    text: "Dog walkers must clear up after their dog in all public places. Officers can issue a fixed penalty notice, and bags are available free from the library.",
  },
  {
    id: "D13",
    title: "Report a noise problem",
    text: "Report persistent noise from neighbours, parties, alarms or building sites. An officer may install recording equipment and can serve an abatement notice.",
  },
  {
    id: "D14",
    title: "Report a broken streetlight",
    text: "Report a faulty streetlight using the number printed on the column. Most faults are repaired within seven working days.",
  },
];

export const questions: LabQuestion[] = [
  {
    id: "sofa",
    text: "How much does it cost to take away an old sofa?",
    relevant: ["D03"],
  },
  {
    id: "bin",
    text: "Which day do they empty my bin?",
    relevant: ["D01"],
  },
  {
    id: "car",
    text: "Can I park my car outside my house?",
    relevant: ["D05"],
  },
  {
    id: "pothole",
    text: "Who do I tell about a pothole on my street?",
    relevant: ["D04"],
  },
  {
    id: "beer",
    text: "Do I need a permit to sell beer?",
    relevant: ["D07"],
  },
  {
    id: "van-permit",
    text: "Can I get a permit for my van?",
    relevant: ["D05"],
    note: "This is the trade-off. The same rule that helps the beer question (permit → licence) also rewards the street-trading page for mentioning vans and licences. One rule, applied everywhere, helps one question and hurts another.",
  },
  {
    id: "kids-library",
    text: "What are the library rules for kids?",
    relevant: ["D09", "D10"],
  },
  {
    id: "alone",
    text: "Is there a council tax discount if I live alone?",
    relevant: ["D11"],
  },
  {
    id: "loud",
    text: "How do I complain about loud parties next door?",
    relevant: ["D13"],
  },
  {
    id: "lamp",
    text: "Who fixes a dark lamp post?",
    relevant: ["D14"],
    note: "Neither approach can recover from a vocabulary gap nobody anticipated. The page says “streetlight” and “faulty”; the question says “lamp post” and “dark”. A synonym map only knows the rules someone wrote.",
  },
];

export const synonymRules: SynonymRule[] = [
  { id: "bin", from: "bin", to: ["waste", "refuse"] },
  { id: "sofa", from: "sofa", to: ["furniture"] },
  { id: "cost", from: "cost", to: ["charge"] },
  { id: "car", from: "car", to: ["vehicle"] },
  { id: "permit", from: "permit", to: ["licence"] },
  { id: "beer", from: "beer", to: ["alcohol"] },
  { id: "kids", from: "kids", to: ["child", "children"] },
  { id: "alone", from: "alone", to: ["single"] },
  { id: "loud", from: "loud", to: ["noise"] },
];

export const defaultQuestionId = "sofa";
export const defaultK = 3;
export const kOptions = [1, 3, 5] as const;
