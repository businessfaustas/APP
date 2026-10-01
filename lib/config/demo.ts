/** Demo-mode constants (isomorphic). */
export const DEMO_USER = {
  id: "demo-user",
  email: "demo@auctionpulse.app",
  name: "Demo Flipper",
} as const;

export const DEMO_COOKIE = "ap_demo_session";

export interface DemoLot {
  id: string;
  url: string;
  label: string;
  description: string;
}

/** Sample lots shown as "Try a demo lot" chips. */
export const DEMO_LOTS: DemoLot[] = [
  {
    id: "audi-a3",
    url: "https://www.copart.com/lot/90000001",
    label: "2019 Audi A3 · front end",
    description: "Salvage, runs & drives — the reference GO deal",
  },
  {
    id: "camry-flood",
    url: "https://www.iaai.com/VehicleDetail/90000002~US",
    label: "2021 Toyota Camry · flood",
    description: "Water damage, interior soaked",
  },
  {
    id: "f150-rear",
    url: "https://bid.cars/en/lot/1-90000003/2020-Ford-F-150",
    label: "2020 Ford F-150 · rear end",
    description: "Bed and bumper damage",
  },
  {
    id: "model3-side",
    url: "https://www.copart.com/lot/90000004",
    label: "2022 Tesla Model 3 · side",
    description: "Left-side impact near the battery",
  },
  {
    id: "civic-cod",
    url: "https://www.copart.com/lot/90000005",
    label: "2017 Honda Civic · destruction cert",
    description: "Non-repairable title",
  },
];
