import { MetroLine } from "../types/station";

export const METRO_LINES: MetroLine[] = [
  {
    id: "blue",
    name: "Blue Line",
    lineCode: "Line 1",
    bengaliName: "ব্লু লাইন (উত্তর-দক্ষিণ করিডর)",
    color: "#0072CE",
    textColor: "#FFFFFF",
    terminus: ["Dakshineswar", "Kavi Subhash"],
    status: "operational",
    confidence: "verified",
  },
  {
    id: "green",
    name: "Green Line",
    lineCode: "Line 2",
    bengaliName: "গ্রিন লাইন (পূর্ব-পশ্চিম করিডর)",
    color: "#00A651",
    textColor: "#FFFFFF",
    terminus: ["Howrah Maidan", "Salt Lake Sector V"],
    status: "operational",
    confidence: "verified",
  },
  {
    id: "purple",
    name: "Purple Line",
    lineCode: "Line 3",
    bengaliName: "পার্পল লাইন",
    color: "#7B2CBF",
    textColor: "#FFFFFF",
    terminus: ["Joka", "Majerhat"],
    status: "partially_operational",
    confidence: "development",
  },
  {
    id: "orange",
    name: "Orange Line",
    lineCode: "Line 6",
    bengaliName: "অরেঞ্জ লাইন",
    color: "#FF7900",
    textColor: "#FFFFFF",
    terminus: ["Kavi Subhash", "Beleghata"],
    status: "partially_operational",
    confidence: "verified",
  },
  {
    id: "yellow",
    name: "Yellow Line",
    lineCode: "Line 4",
    bengaliName: "ইয়েলো লাইন",
    color: "#FCCC0A",
    textColor: "#000000",
    terminus: ["Noapara", "Jai Hind (Bimanbandar)"],
    status: "partially_operational",
    confidence: "verified",
  },
  {
    id: "pink",
    name: "Pink Line",
    lineCode: "Line 5",
    bengaliName: "পিঙ্ক লাইন (পরিকল্পিত)",
    color: "#E91E63",
    textColor: "#FFFFFF",
    terminus: ["Baranagar", "Barrackpore"],
    status: "under_construction",
    confidence: "planned",
  },
];

export function getLineById(id: string): MetroLine | undefined {
  return METRO_LINES.find((l) => l.id === id);
}
