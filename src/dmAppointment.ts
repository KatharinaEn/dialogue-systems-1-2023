import { getEnabledCategories } from "trace_events";
import { MachineConfig, send, Action, assign } from "xstate";

function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
};

/*interface grammar {
  [index: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}*/

/*const grammar: grammar = {
  lecture: {
    intent: "None",
    entities: { title: "Dialogue systems lecture" },
  },
  lunch: {
    intent: "None",
    entities: { title: "Lunch at the canteen" },
  },
  "on friday": {
    intent: "None",
    entities: { day: "Friday" },
  },
  "at 10": {
    intent: "None",
    entities: { time: "10" },
  },
  training: {
    intent: "None",
    entities: { day: "training"},
  },
  consert: {
    intent: "None",
    entities: {evening: "classical consert"}, 
  },
  brunch: {
    intent: "None",
    entities: {time: "11:00"},
  }, 
  "yes": {
    intent: "None",
    entities: {confirm: "yes"},
    },
  "no": {
    intent: "None",
    entities: {deny: "no"},
    },
    "person" : {
      intent: "None",
      entities: { person: "Beyonce"},
  },
  "create a meeting": {
    intent: "None",
    entities: { start: "Let's create a meeting"},
  }
};*/

const getEntity = (context: SDSContext, entity: string) => {
  console.log('nluResult:');
  console.log(context.nluResult)
  /*let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");*/
  return context.nluResult.prediction.intents[0].category
}; 

const getEntity1 = (context: SDSContext, entity: string) => {
  console.log('nluResult:');
  console.log(context.nluResult);
  const getEntity1 = (context: SDSContext, entity: string) => {
    console.log('nluResult:');
    console.log(context.nluResult);
    if (context.nluResult.prediction.entities[0] === 0) {
    console.log(say("Sorry, can you repeat what you said?"));
    return ".meeting";
  }
  else if (context.nluResult.prediction.entities.length > 0) {
   return ".whichday";
  }
};
   
}
  

// if (context.nluResult.prediction.entities[0] === 0) {
//   console.log(say("Sorry, can you repeat what you said?"));
//   return {
//     newState: ".meeting",
//     data: null
//   };
// } else if (context.nluResult.prediction.entities.length > 0) {
//   return {
//     newState: ".whichday",
//     data: null 
//   };
// }
// };


//if(nluResult.prediction.entities.length > 0) { // do something with nluResult.prediction.entities[0] }

  // lowercase the utterance and remove tailing "."
  /*let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  if (u in grammar) {
    if (entity in grammar[u].entities)
   {
      return grammar[u].entities[entity];
    }
  }
};*/



export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = {
  initial: "idle",
  states: {
    idle: {
      on: {
        CLICK: "init",
      },
    },
    init: {
      on: {
        TTS_READY: "meeting",
        CLICK: "meeting",
      },
    },
    meeting: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "welcome",
            cond: (context) => getEntity(context) === "create a meeting",
          },
          {
            target: "who_is_it",
            cond: (context) => getEntity(context) === "ask_celebrity",
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Hi Katharina! What are your plans today?"),
          on: {ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, can you repeat that?"),
          on: { ENDSPEECH: "ask"},
        },
      },
    },
    who_is_it: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `${context.person} is a singer`,
        })),
      on: { ENDSPEECH: "meeting_X" },
    },
    meeting_X: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "whichday",
            cond: (context) => getEntity(context) === "who_is_it",
          },
          {
            target: "meeting",
            cond: (context) => getEntity(context) === "negative",
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Do you want to meet them?"),
          on: {ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, I don't know what it is. Tell me something I know."),
          on: {ENDSPEECH: "ask"},
        },
      },
    },
    welcome: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "info",
            cond: (context) => getEntity(context) === "meeting",
            actions: assign({
              title: (context) => getEntity1(context, "title"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Let's create a meeting. What is it about?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    info: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.title}`,
      })),
      on: { ENDSPEECH: "whichday" },
    },
    dayinfo: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.day}`,
      })),
      on: { ENDSPEECH: "wholeday" },
    },
    whichday: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "repeatday",
            cond: (context) => getEntity(context) === "day_of_meeting",
            actions: assign({
              day: (context) => getEntity1(context, "day"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("On which day is the meeting?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, I don't know what it is. Tell me something I know."),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    repeatday: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.day}`,
      })),
      on: { ENDSPEECH: "wholeday" },
    },
    wholeday: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "meetingtimenotspecific",
            cond: (context) => getEntity(context) === "positive",
          },
          {
            target: "meetingtime",
            cond: (context) => getEntity(context) === "negative",
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("Will it take the whole day?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I don't know what it is. Tell me something I know."
          ),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    meetingtime: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "meetingtime_specific",
            cond: (context) => getEntity(context) === "time_of_meeting",
            actions: assign({
              time: (context) => getEntity1(context, "time"),
            }),
          },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: ".prompt",
      },
      states: {
        prompt: {
          entry: say("What time is your meeting?"),
          on: {ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say("Sorry, can you repeat that?"),
          on: { ENDSPEECH: "ask"},
        },
      },
    },
    meetingtime_specific: {
        initial: "prompt",
        on: {
          RECOGNISED: [
            {
              target: "created",
              cond: (context) => getEntity(context) === "positive",
            },
            {
              target: "welcome",
              cond: (context) => getEntity(context) === "negative",
            },
            {
              target: ".nomatch",
            },
          ],
          TIMEOUT: ".prompt",
        },
        states: {
          prompt: {
            entry: send((context) => ({
              type: "SPEAK",
              value: `Do you want me to create a meeting titled ${context.title}, on ${context.day}  at ${context.time}?`
            })),
          on: { ENDSPEECH: "ask" },
          },
          ask: {
            entry: send("LISTEN"),
          },
          nomatch: {
            entry: say(
              "Sorry, I don't know what it is. Tell me something I know."
            ),
          },
        },
      },
      meetingtimenotspecific: {
          initial: "prompt",
          on: {
            RECOGNISED: [
              {
                target: "created",
                cond: (context) => getEntity(context) === "positive",
              },
              {
                target: "meeting",
                cond: (context) => getEntity(context) === "negative",
              },
              {
                target: ".nomatch",
              },
            ],
            TIMEOUT: ".prompt",
          },
          states: {
            prompt: {
              entry: send((context) => ({
                type: "SPEAK",
                value: `Do you want me to create a meeting titled ${context.title}, on ${context.day}  for the whole day?`
              })),
              on: { ENDSPEECH: "ask" },
            },
            ask: {
              entry: send("LISTEN"),
            },
            nomatch: {
              entry: say(
                "Sorry, I don't know what it is. Tell me something I know."
              ),
            },
          },
        },
        created: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Your meeting has been created`,
          })),
        },
      },
};
    

/*const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json())


















// const kbRequest = (text: string) =>
//   fetch(
//     new Request(
//       `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
//     )
//   ).then((data) => data.json())*/
