# AstroSure Insurance Quoting Engine

AstroSure is an insurance company. But not just any boring old insurance company... AstroSure is the first exclusive provider of space mission insurance! Insuring the tremendous risk involved with interplanetary exploration is no easy task and the world's top space companies depend on AstroSure to accurately and efficiently assess and transfer the risk. However, until now, underwriting space missions has been an entirely manual task prone to error and productivity bottlenecks.

AstroSure has hired you to build an application that automates their proprietary underwriting model and returns a quote for an insurance policy to the client.

### Instructions
- Install node v18.0.0 or later
- Clone the repository
- Branch off master
- Run `npm install`
- Review the Project Requirements
- Get all tests in `main.spec.ts` passing
- When you're ready, open a PR
- Be prepared to talk about the code (What you wrote ***and*** what was provided to you)

### Project Requirements
- Implement the `QuoteRequest` and `Quote` types. Use `main.spec.ts` as reference.

- Implement the `getUnknownDangerLevelFromThirdParty` function. It should make a `GET` request and return a 0-100 value from https://www.randomnumberapi.com/api/v1.0/randomnumber?min=0&max=100&count=1.

- Implement the `calculateMissionScore` method on the `MissionScoringService`. It should get condition and pass the value to the condition's corresponding `getScore` method in the score model. It should return the sum of all relevant condition scores multiplied by their scoreWeight.

- Implement the `createQuote` function. It should use relevant services to calculate a mission score, establish a base rate, apply necessary rate adjustments, calculate the premium, and set the quote status. It should build a quote object, add it to quoteStorage, and return the new quote storage in a way that ***does not mutate*** the quote storage array that was provided as a parameter.


- Quotes should be declined in the following scenarios:
    - The `missionScore` is less than or equal to 15.
    
    - The total `policyAmount` on all quotes with an "approved" status for the requesting company, plus the requested `policyAmount` is greater than $2,000,000,000.

    <br />
- Quotes should have the following base rates:

    | `spaceshipSize` | Base Rate |
    | ---- | ---- |
    | `small` | 2% |
    | `large` | 3% |

    <br />
- Quotes should have the following rate adjustments:

    | `missionScore` | Rate Adjustment |
    | ---- | ---- |
    | <= 25 | - 0.2% |
    | > 25 && <= 55 | 0% |
    | > 55 | + 0.8% |



### Bonus

For bonus points, you may implement some sort of enhancement to the quoting engine. This enhancement can be anything from code optimizaiton to an entirely new feature. At the top of `main.ts`, provide a short expalantion of your enhancement and why you think it is important. An enhancement that doesn't perfectly align with the "real world" of insurance is totally fine as long as you are able to describe your basic assumptions that led you to your solution. Please update the tests to provide adequate code coverage for your enhancement.