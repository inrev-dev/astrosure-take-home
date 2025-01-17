/////////////////
///   Types   ///
/////////////////

export type MissionConditionDataset<TMissionScoringModel extends MissionScoringModel> = {
  [K in keyof TMissionScoringModel]: TMissionScoringModel[K] extends {
    getScore: (value: infer U) => any;
  }
  ? U
  : never;
};

type MissionType = "lunar-landing" | "shuttle";

type SpaceshipSize = "small" | "large";

type Scale = "low" | "medium" | "high"

type Quantity = "few" | "many"

type Status = "approved" | "declined"

type MissionScoringModel = Record<string, { getScore: (value: any) => number; scoreWeight: number }>;

type QuoteRequest = {
  companyName: string;
  policyAmount: number;
  spaceshipName: string;
  spaceshipSize: SpaceshipSize;
  missionType: MissionType;
};

type Quote = {
  companyName: string;
  policyAmount: number;
  spaceshipName: string;
  spaceshipSize: SpaceshipSize;
  missionType: MissionType;
  missionScore: number;
  rate: number;
  premium: number;
  status: string;
};

/////////////////////
///   Constants   ///
/////////////////////

const POLICY_LIMIT = 2_000_000_000;

//////////////////////////////
///   Mission Conditions   ///
//////////////////////////////

export abstract class MissionConditionsService<TMissionScoringModel extends MissionScoringModel> {
  constructor(protected getUnknownDangerLevel: () => Promise<number | undefined>) { }

  abstract getMissionConditions(): Promise<MissionConditionDataset<TMissionScoringModel>>;

  getRandom<T extends string>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  }
}

export class LunarLandingConditionsService extends MissionConditionsService<typeof lunarLandingScoringModel> {
  private constructor(getUnknownDangerLevel: () => Promise<number | undefined>) {
    super(getUnknownDangerLevel);
  }

  async getMissionConditions() {
    return {
      atmosphericPressure: this.getRandom(["low", "medium", "high"]),
      solarWindSpeed: this.getRandom(["low", "medium", "high"]),
      nearbySatellites: this.getRandom(["few", "many"]),
      unknownDangerLevel: (await this.getUnknownDangerLevel()) ?? 100,
    };
  } 

  static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
    return new LunarLandingConditionsService(getUnknownDangerLevel);
  }
}

export class ShuttleConditionsService extends MissionConditionsService<typeof shuttleScoringModel> {
  private constructor(getUnknownDangerLevel: () => Promise<number | undefined>) {
    super(getUnknownDangerLevel);
  }

  async getMissionConditions() {
    return {
      issOrbitalSpeed: this.getRandom(["low", "medium", "high"]),
      nearbySatellites: this.getRandom(["few", "many"]),
      unknownDangerLevel: (await this.getUnknownDangerLevel()) ?? 100,
    };
  }

  static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
    return new ShuttleConditionsService(getUnknownDangerLevel);
  }
}

export class MissionConditionsServiceFactory {
  static create(missionType: MissionType, getUnknownDangerLevel: () => Promise<number | undefined>):
    MissionConditionsService<(typeof missionScoringModelMap)[typeof missionType]> {
    switch (missionType) {
      case "lunar-landing":
        return LunarLandingConditionsService.create(getUnknownDangerLevel);
      case "shuttle":
        return ShuttleConditionsService.create(getUnknownDangerLevel);
    }
  }
}

///////////////////////////
///   Mission Scoring   ///
///////////////////////////

export const lunarLandingScoringModel = {
  atmosphericPressure: {
    getScore: (value: Scale) => ({ low: 100, medium: 50, high: 0 })[value],
    scoreWeight: 0.5,
  },
  solarWindSpeed: {
    getScore: (value: Scale) => ({ low: 100, medium: 80, high: 0 })[value],
    scoreWeight: 0.3,
  },
  nearbySatellites: {
    getScore: (value: Quantity) => ({ few: 100, many: 0 })[value],
    scoreWeight: 0.1,
  },
  unknownDangerLevel: {
    getScore: (value: number) => 100 - value,
    scoreWeight: 0.1,
  },
};

export const shuttleScoringModel = {
  issOrbitalSpeed: {
    getScore: (value: Scale) => ({ low: 100, medium: 30, high: 0 })[value],
    scoreWeight: 0.8,
  },
  nearbySatellites: {
    getScore: (value: Quantity) => ({ few: 100, many: 0 })[value],
    scoreWeight: 0.1,
  },
  unknownDangerLevel: {
    getScore: (value: number) => 100 - value,
    scoreWeight: 0.1,
  },
};

export const missionScoringModelMap = {
  "lunar-landing": lunarLandingScoringModel,
  "shuttle": shuttleScoringModel,
};

export class MissionScoringService<TMissionScoringModel extends MissionScoringModel> {
  private constructor(
    private missionScoringModel: TMissionScoringModel,
    private missionConditionsDataService: MissionConditionsService<TMissionScoringModel>,
  ) { }

  async calculateMissionScore(): Promise<number> {
    const conditions = await this.missionConditionsDataService.getMissionConditions();

    return Object.entries(conditions).reduce(
      (total, [condition, value]) => {
        const model = this.missionScoringModel[condition];
        const score = model.getScore(value);
        return total + score * model.scoreWeight;
      },
      0
    );
  }

  static create<TMissionScoringModel extends MissionScoringModel>(
    missionScoringModel: TMissionScoringModel,
    missionConditionsDataService: MissionConditionsService<TMissionScoringModel>,
  ) {
    return new MissionScoringService(missionScoringModel, missionConditionsDataService)
  }
}

export class MissionScoringServiceFactory {
  static create(missionType: MissionType) {
    if (missionType === "lunar-landing") {
      const conditionsDataService = LunarLandingConditionsService.create(getUnknownDangerLevelFromThirdParty);
      return MissionScoringService.create(missionScoringModelMap["lunar-landing"], conditionsDataService);
    }

    if (missionType === "shuttle") {
      const conditionsDataService = ShuttleConditionsService.create(getUnknownDangerLevelFromThirdParty);
      return MissionScoringService.create(missionScoringModelMap["shuttle"], conditionsDataService);
    }

    throw new Error("Invalid MissionConditionsDataService passed to MissionScoringServiceFactory",);
  }
}

////////////////////////////////
///   Unknown Danger Level   ///
////////////////////////////////

export const getUnknownDangerLevelFromThirdParty = async (): Promise<number | undefined> => {
  try {
    const result = await fetch("https://www.randomnumberapi.com/api/v1.0/randomnumber?min=0&max=100&count=1");
    return (await result.json()) as number;
  } catch (error) {
    console.error(error);
  }
};

//////////////////////////////////////
///        Helper functions        ///
//////////////////////////////////////

const calculateTotalPolicyAmount = (request: QuoteRequest, quoteStorage: Quote[]): number => {
  const sum = quoteStorage
    .filter(quote => quote.status === "approved" && quote.companyName === request.companyName)
    .reduce((prev, curr) => prev + curr.policyAmount, 0);

  return sum + request.policyAmount;
};

const calculateStatus = (score: number, totalPolicyAmount: number): Status => {
  let status: Status = "approved";

  if (score <= 15) status = "declined";
  if (totalPolicyAmount > POLICY_LIMIT) status = "declined";

  return status
}

const calculateRate = (score: number, request: QuoteRequest): number => {
  let rate = 0;

  if (request.spaceshipSize === "small") rate = 20;
  if (request.spaceshipSize === "large") rate = 30;

  if (score <= 25) rate += 8;
  if (score > 55) rate -= 2;

  return rate / 1000
}

/////////////////////////////////////
///   Create Quote (Entrypoint)   ///
/////////////////////////////////////

export const createQuote = async (request: QuoteRequest, quoteStorage: Quote[]): Promise<Quote[]> => {
  const missionScoringService = MissionScoringServiceFactory.create(request.missionType);
  const missionScore = await missionScoringService.calculateMissionScore();

  const totalPolicyAmmount = calculateTotalPolicyAmount(request, quoteStorage);
  const status = calculateStatus(missionScore, totalPolicyAmmount)
  const rate = calculateRate(missionScore, request)
  const premium = rate * request.policyAmount

  return [...quoteStorage, { ...request, missionScore, rate, premium, status }]
};
