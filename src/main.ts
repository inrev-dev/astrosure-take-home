/////////////////
///   Types   ///
/////////////////

export type MissionType = "lunar-landing" | "shuttle";

export type SpaceshipSize = "small" | "medium" | "large";

export type MissionConditionDataset<
  TMissionScoringModel extends MissionScoringModel,
> = {
  [K in keyof TMissionScoringModel]: TMissionScoringModel[K] extends {
    getScore: (value: infer U) => any;
  }
    ? U
    : never;
};

export type MissionScoringModel = Record<
  string,
  { getScore: (value: any) => number; scoreWeight: number }
>;

/*
 {
      companyName: "NASA",
      policyAmount: 1000000000,
      spaceshipName: "Appolo 11",
      spaceshipSize: "small",
      missionType: "lunar-landing"
  }
 */

/*
{
  companyName: string
  policyAmount: 1000000000;
  spaceshipName: "Appolo 11";
  spaceshipSize: "small";
  missionType: "lunar-landing";
  missionScore: 93;
  rate: 0.018;
  premium: 18000000;
  status: "approved";
}
 */

export type QuoteRequest = {
  companyName: string;
  policyAmount: number;
  spaceshipName: string;
  spaceshipSize: SpaceshipSize;
  missionType: MissionType;
};

export type Quote = {
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

//////////////////////////////
///   Mission Conditions   ///
//////////////////////////////

export abstract class MissionConditionsService<
  TMissionScoringModel extends MissionScoringModel,
> {
  constructor(
    protected getUnknownDangerLevel: () => Promise<number | undefined>,
  ) {}

  abstract getMissionConditions(): Promise<
    MissionConditionDataset<TMissionScoringModel>
  >;
}

export class LunarLandingConditionsService extends MissionConditionsService<
  typeof lunarLandingScoringModel
> {
  private constructor(
    getUnknownDangerLevel: () => Promise<number | undefined>,
  ) {
    super(getUnknownDangerLevel);
  }

  async getMissionConditions() {
    return {
      atmosphericPressure: (["low", "medium", "high"] as const)[
        Math.floor(Math.random() * 3)
      ],
      solarWindSpeed: (["low", "medium", "high"] as const)[
        Math.floor(Math.random() * 3)
      ],
      nearbySatellites: (["few", "many"] as const)[
        Math.floor(Math.random() * 2)
      ],
      unknownDangerLevel: (await this.getUnknownDangerLevel()) ?? 100,
    };
  }

  static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
    return new LunarLandingConditionsService(getUnknownDangerLevel);
  }
}

export class ShuttleConditionsService extends MissionConditionsService<
  typeof shuttleScoringModel
> {
  private constructor(
    getUnknownDangerLevel: () => Promise<number | undefined>,
  ) {
    super(getUnknownDangerLevel);
  }

  async getMissionConditions() {
    return {
      issOrbitalSpeed: (["low", "medium", "high"] as const)[
        Math.floor(Math.random() * 3)
      ],
      nearbySatellites: (["few", "many"] as const)[
        Math.floor(Math.random() * 2)
      ],
      unknownDangerLevel: (await this.getUnknownDangerLevel()) ?? 100,
    };
  }

  static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
    return new ShuttleConditionsService(getUnknownDangerLevel);
  }
}

export class MissionConditionsServiceFactory {
  static create(
    missionType: MissionType,
    getUnknownDangerLevel: () => Promise<number | undefined>,
  ): MissionConditionsService<
    (typeof missionScoringModelMap)[typeof missionType]
  > {
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
    getScore: (value: "low" | "medium" | "high") =>
      ({
        low: 100,
        medium: 50,
        high: 0,
      })[value],
    scoreWeight: 0.5,
  },
  solarWindSpeed: {
    getScore: (value: "low" | "medium" | "high") =>
      ({
        low: 100,
        medium: 80,
        high: 0,
      })[value],
    scoreWeight: 0.3,
  },
  nearbySatellites: {
    getScore: (value: "few" | "many") =>
      ({
        few: 100,
        many: 0,
      })[value],
    scoreWeight: 0.1,
  },
  unknownDangerLevel: {
    getScore: (value: number) => 100 - value,
    scoreWeight: 0.1,
  },
};

export const shuttleScoringModel = {
  issOrbitalSpeed: {
    getScore: (value: "low" | "medium" | "high") =>
      ({
        low: 100,
        medium: 30,
        high: 0,
      })[value],
    scoreWeight: 0.8,
  },
  nearbySatellites: {
    getScore: (value: "few" | "many") =>
      ({
        few: 100,
        many: 0,
      })[value],
    scoreWeight: 0.1,
  },
  unknownDangerLevel: {
    getScore: (value: number) => 100 - value,
    scoreWeight: 0.1,
  },
};

export const missionScoringModelMap = {
  "lunar-landing": lunarLandingScoringModel,
  shuttle: shuttleScoringModel,
};

export class MissionScoringService<
  TMissionScoringModel extends MissionScoringModel,
> {
  private constructor(
    private missionScoringModel: TMissionScoringModel,
    private missionConditionsDataService: MissionConditionsService<TMissionScoringModel>,
  ) {}

  async calculateMissionScore(): Promise<number> {
    const conditions =
      await this.missionConditionsDataService.getMissionConditions();

    return Object.entries(conditions).reduce(
      (totalScore, [condition, value]) => {
        const model = this.missionScoringModel[condition];
        if (!model) return totalScore;
        return totalScore + model.getScore(value) * model.scoreWeight;
      },
      0,
    );
  }

  static create<TMissionScoringModel extends MissionScoringModel>(
    missionScoringModel: TMissionScoringModel,
    missionConditionsDataService: MissionConditionsService<TMissionScoringModel>,
  ) {
    return new MissionScoringService(
      missionScoringModel,
      missionConditionsDataService,
    );
  }
}

export class MissionScoringServiceFactory {
  static create(
    conditionsDataService: MissionConditionsService<MissionScoringModel>,
  ) {
    if (conditionsDataService instanceof LunarLandingConditionsService) {
      return MissionScoringService.create(
        missionScoringModelMap["lunar-landing"],
        conditionsDataService,
      );
    }

    if (conditionsDataService instanceof ShuttleConditionsService) {
      return MissionScoringService.create(
        missionScoringModelMap["shuttle"],
        conditionsDataService,
      );
    }

    throw new Error(
      "Invalid MissionConditionsDataService passed to MissionScoringServiceFactory",
    );
  }
}

////////////////////////////////
///   Unknown Danger Level   ///
////////////////////////////////

export const getUnknownDangerLevelFromThirdParty = async (): Promise<
  number | undefined
> => {
  try {
    const resp = await fetch(
      "https://www.randomnumberapi.com/api/v1.0/randomnumber?min=0&max=100&count=1",
    );
    return (await resp.json()) as number;
  } catch (error) {
    console.error(error);
    return;
  }
};

/////////////////////////////////////
///   Create Quote (Entrypoint)   ///
/////////////////////////////////////

export const createQuote = async (
  request: QuoteRequest,
  quoteStorage: Quote[],
): Promise<Quote[]> => {
  const lunarLandingConditionsService = LunarLandingConditionsService.create(
    getUnknownDangerLevelFromThirdParty,
  );
  const missionScoring = MissionScoringService.create(
    lunarLandingScoringModel,
    lunarLandingConditionsService,
  );
  const missionScore = await missionScoring.calculateMissionScore();

  let status = "approved";
  if (missionScore <= 15) {
    status = "declined";
  }
  const totalPolicyAmmount =
    quoteStorage
      .filter((quote) => quote.status === "approved" && quote.companyName === request.companyName)
      .reduce((prev, curr) => prev + curr.policyAmount, 0) +
    request.policyAmount;
  if (totalPolicyAmmount > 2000000000) {
    status = "declined"
  }

  quoteStorage.push({
    companyName: request.companyName,
    policyAmount: request.policyAmount,
    spaceshipName: request.spaceshipName,
    spaceshipSize: request.spaceshipSize,
    missionType: request.missionType,
    missionScore,
    rate: 100,
    premium: 100,
    status,
  });

  return quoteStorage;
};
