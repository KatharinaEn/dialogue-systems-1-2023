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
  "at 10 in the morning": {
    intent: "None",
    entities: { time: "10" },
  },
  training: {
    intent: "None",
    entities: { day: "training"},
  },
  consert: {
    intent: "None",
    entities: {evening: " classical consert"}, 
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
    "who is Zelenskyy": {
      intent: "None",
      entities: {famousperson: "Zelenskyy"},
    },
    " i want to create a meeting": {
      intent: "None",
      entities: {start: "I want to create a meeting?"},
    },
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
        TTS_READY: "Greeting",
        CLICK: "Greeting",
      },
    },
    Greeting: {
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
            cond: (context) => !!getEntity(context, "famousperson"),
            actions: assign({
              famousperson: (context) => getEntity(context, "famousperson"),
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
          entry: say("Hi Katharina. What do you want to do today?"),
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
    who_is_it: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `${context.famousperson} is a politician`,
        })),
      on: { ENDSPEECH: "confirmMeeting" },
    },
    confirmmeeting: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "wholeDay",
            cond: (context) => !!getEntity(context, "confirm"),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }),
          },
          {
            target:"meetingTitleDateWholeDay",
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
            value: `Do you want to meet them?` 
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
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    yesmeeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, meeting created` 
      })),
      on: { ENDSPEECH: "" },
    },
    nomeeting: {
      entry: say("starting over"),
      on: { ENDSPEECH: "welcome" },
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
      on: { ENDSPEECH: "Day" },
    },
    Day: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "dayOfMeeting",
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
          entry: say("what day is the meeting?"),
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
    wantMeet: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, meeting with ${context.famousperson}`,
      })),
      on: { ENDSPEECH: "MeetingTime" },
    },
    dayOfMeeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, meeting with ${context.day}`,
      })),
      on: { ENDSPEECH: "MeetingTime" },
    },
    MeetingTime: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "wholeDay",
            cond: (context) => !!getEntity(context, "confirm"),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }),
          },
          {
            target:"meetingTitleDateWholeDay",
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
    wholeDay: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, whole day it is then.`, 
      })),
      on: { ENDSPEECH: "confirmmeeting" },
    },
    confirmMeeting: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "famouspersonyesmeeting",
            cond: (context) => !!getEntity(context, "confirm"),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }),
          },
          {
            target:"famouspersonnomeeting",
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
            value: `Do you want me to create a meeting titled ${context.title}, on ${context.day} for the whole day?` 
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
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    famouspersonyesmeeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, meeting created` 
      })),
      on: { ENDSPEECH: "Whichday" },
    },
    famouspersonnomeeting: {
      entry: say("starting over"),
      on: { ENDSPEECH: "init" },
    },
    meetingTitleDateWholeDay: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "meetingTitleDateTime_specific",
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
    Whichday: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "MeetingTime",
            cond: (context) => !!getEntity(context, "MeetingTime"),
            actions: assign({
              meetingTime: (context) => getEntity(context, "MeetingTime"),
            }),
          },
          {
            target: "wantMeet",
            cond: (context) => !!getEntity(context, "wantMeet"),
            actions: assign({
              wantmeet: (context) => getEntity(context, "wantMeet"),
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
          entry: say("On which day is it?"),
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
    whichDay: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `On which day is it?)`,
        })),
      on: { ENDSPEECH: "MeetingTime" },
    },
    meetingTitleDateTime_specific: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Ok! meeting at ${context.time}`,
      })),
      on: { ENDSPEECH: "Confirmmeeting" },
    }, 
    Confirmmeeting: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "Yesmeeting",
            cond: (context) => !!getEntity(context, "confirm"),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }),
          },
          {
            target:"Nomeeting",
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
            value: `Do you want me to create a meeting titled ${context.title}, on ${context.day} at ${context.time}?` 
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
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    Yesmeeting: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, meeting created` 
      })),
      on: { ENDSPEECH: "init" },
    },
    Nomeeting: {
      entry: say("starting over"),
      on: { ENDSPEECH: "welcome" },
    },
    meetingTitleDateTime: {
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
            value: `Do you want me to create a meeting titled ${context.title}, on ${context.day} for the whole day?`
          })),
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
      on: { ENDSPEECH: "welcome" },
    },
  },
};

















const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json())
  

      