import { MachineConfig, send, Action, assign } from "xstate";

function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}

interface Grammar {
  [index: string]: {
    intent: string;
    entities: {
      [index: string]: string;
    };
  };
}

const grammar: Grammar = {
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
    entities: { title: "training"},
  },
  concert: {
    intent: "None",
    entities: {title: "classical concert"}, 
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
};

const getEntity = (context: SDSContext, entity: string) => {
  // lowercase the utterance and remove tailing "."
  let u = context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "");
  if (u in grammar) {
    if (entity in grammar[u].entities) {
      return grammar[u].entities[entity];
    }
  }
  return false;
};

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
            cond: (context) => !!getEntity(context, "start"),
            actions: assign({
              start: (context) => getEntity(context, "start"),
            }),
          },
          {
            target: "who_is_it",
            cond: (context) => !!getEntity(context, "person"),
            actions: assign({
              person: (context) => getEntity(context, "person"),
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
            cond: (context) => !!getEntity(context, "confirm"),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }),
          },
          {
            target: "meeting",
            cond: (context) => !!getEntity(context, "deny"),
            actions: assign({
              deny: (context) => getEntity(context, "deny"),
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
            cond: (context) => !!getEntity(context, "title"),
            actions: assign({
              title: (context) => getEntity(context, "title"),
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
            cond: (context) => !!getEntity(context, "day"),
            actions: assign({
              day: (context) => getEntity(context, "day"),
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
            cond: (context) => !!getEntity(context, "confirm"),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }),
          },
          {
            target: "meetingtime",
            cond: (context) => !!getEntity(context, "deny"),
            actions: assign({
              deny: (context) => getEntity(context, "deny"),
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
            cond: (context) => !!getEntity(context, "time"),
            actions: assign({
              time: (context) => getEntity(context, "time"),
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
              cond: (context) => !!getEntity(context, "confirm"),
              actions: assign({
                confirm: (context) => getEntity(context, "confirm"),
              }),
            },
            {
              target: "welcome",
              cond: (context) => !!getEntity(context, "deny"),
              actions: assign({
                deny: (context) => getEntity(context, "deny"),
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
                cond: (context) => !!getEntity(context, "confirm"),
                actions: assign({
                  confirm: (context) => getEntity(context, "confirm"),
                }),
              },
              {
                target: "meeting",
                cond: (context) => !!getEntity(context, "deny"),
                actions: assign({
                  deny: (context) => getEntity(context, "deny"),
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
    

const kbRequest = (text: string) =>
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
//   ).then((data) => data.json())
