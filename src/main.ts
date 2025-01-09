/////////////////
///   Types   ///
/////////////////

export type MissionType = 'lunar-landing' | 'shuttle';

export type MissionConditionDataset<TMissionScoringModel extends MissionScoringModel> = {
    [K in keyof TMissionScoringModel]: TMissionScoringModel[K] extends { getScore: (value: infer U) => any } ? U : never
}

export type MissionScoringModel = Record<string, { getScore: (value: any) => number, scoreWeight: number }>

/* 
    implement these types:

    export type QuoteRequest =
    export type Quote =
*/



//////////////////////////////
///   Mission Conditions   ///
//////////////////////////////

export abstract class MissionConditionsService<TMissionScoringModel extends MissionScoringModel> {
    constructor(protected getUnknownDangerLevel: () => Promise<number | undefined>) {}

    abstract getMissionConditions(): Promise<MissionConditionDataset<TMissionScoringModel>>;
}

export class LunarLandingConditionsService extends MissionConditionsService<typeof lunarLandingScoringModel> {
    private constructor(getUnknownDangerLevel: () => Promise<number | undefined>) {
        super(getUnknownDangerLevel);
    }

    async getMissionConditions() {
        return {
            atmosphericPressure: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
            solarWindSpeed: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
            nearbySatellites: (['few', 'many'] as const)[Math.floor(Math.random() * 2)],
            unknownDangerLevel: await this.getUnknownDangerLevel() ?? 100
        }
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
            issOrbitalSpeed: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
            nearbySatellites: (['few', 'many'] as const)[Math.floor(Math.random() * 2)],
            unknownDangerLevel: await this.getUnknownDangerLevel() ?? 100,
        }
    }

    static create(getUnknownDangerLevel: () => Promise<number | undefined>) {
        return new ShuttleConditionsService(getUnknownDangerLevel);
    }
}

export class MissionConditionsServiceFactory {
    static create(
        missionType: MissionType,
        getUnknownDangerLevel: () => Promise<number | undefined>
    ): MissionConditionsService<(typeof missionScoringModelMap)[typeof missionType]> {
        switch(missionType) {
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
        getScore: (value: 'low' | 'medium' | 'high') => ({
            low: 100,
            medium: 50,
            high: 0
        }[value]),
        scoreWeight: 0.5
    },
    solarWindSpeed: {
        getScore: (value: 'low' | 'medium' | 'high') => ({
            low: 100,
            medium: 80,
            high: 0
        }[value]),
        scoreWeight: 0.3
    },
    nearbySatellites: {
        getScore: (value: 'few' | 'many') => ({
            few: 100,
            many: 0,
        }[value]),
        scoreWeight: 0.1
    },
    unknownDangerLevel: {
        getScore: (value: number) => 100 - value,
        scoreWeight: 0.1
    }
}

export const shuttleScoringModel = {
    issOrbitalSpeed: {
        getScore: (value: 'low' | 'medium' | 'high') => ({
            low: 100,
            medium: 30,
            high: 0
        }[value]),
        scoreWeight: 0.8
    },
    nearbySatellites: {
        getScore: (value: 'few' | 'many') => ({
            few: 100,
            many: 0,
        }[value]),
        scoreWeight: 0.1
    },
    unknownDangerLevel: {
        getScore: (value: number) => 100 - value,
        scoreWeight: 0.1
    }
};

export const missionScoringModelMap = {
    'lunar-landing': lunarLandingScoringModel,
    'shuttle': shuttleScoringModel
};

export class MissionScoringService<TMissionScoringModel extends MissionScoringModel> {
    private constructor(
        private missionScoringModel: TMissionScoringModel,
        private missionConditionsDataService: MissionConditionsService<TMissionScoringModel>
    ) {}

    async calculateMissionScore(): Promise<number> {
        // implement this method
    }

    static create<TMissionScoringModel extends MissionScoringModel>(
        missionScoringModel: TMissionScoringModel,
        missionConditionsDataService: MissionConditionsService<TMissionScoringModel>
    ) {
        return new MissionScoringService(missionScoringModel, missionConditionsDataService);
    }
}

export class MissionScoringServiceFactory {
    static create(
        conditionsDataService: MissionConditionsService<MissionScoringModel>
    ) {
        if (conditionsDataService instanceof LunarLandingConditionsService) {
            return MissionScoringService.create(missionScoringModelMap["lunar-landing"], conditionsDataService);
        }

        if (conditionsDataService instanceof ShuttleConditionsService) {
            return MissionScoringService.create(missionScoringModelMap["shuttle"], conditionsDataService);
        }

        throw new Error("Invalid MissionConditionsDataService passed to MissionScoringServiceFactory");
    }
}



////////////////////////////////
///   Unknown Danger Level   ///
////////////////////////////////

export const getUnknownDangerLevelFromThirdParty = async (): Promise<number | undefined> => {
    // implement this function
}



/////////////////////////////////////
///   Create Quote (Entrypoint)   ///
/////////////////////////////////////

export const createQuote = async (request: QuoteRequest, quoteStorage: Quote[]): Promise<Quote[]> => {
    // implement this function
}