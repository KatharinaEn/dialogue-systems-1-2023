
import { MachineConfig, send, Action, assign } from "xstate";
import { actions } from "xstate";
import { createMachine } from 'xstate';
const {choose, log} = actions
function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text}));
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
    entities: { date: "Friday" },
  },
  "at 10": {
    intent: "None",
    entities: { time: "10" },
  },
  training: {
    intent: "None",
    entities: { title: "training" },
  },
  concert: {
    intent: "None",
    entities: { title: "classical concert" },
  },
  brunch: {
    intent: "None",
    entities: { time: "11:00" },
  },
  yes: {
    intent: "None",
    entities: { confirm: "yes" },
  },
  no: {
    intent: "None",
    entities: { deny: "no" },
  },
  person: {
    intent: "None",
    entities: { person: "Beyonce" },
  },
  "create a meeting": {
    intent: "None",
    entities: { meeting: "Let's create a meeting" },
  },
  "ask about a famous person": {
    intent: "None",
    entities: { person: "Who is it?" },
  },
  help: {
    intent: "None",
    entities: { help: "So, let's go one step back" },
  },
  check: {
    intent: "None",
    entities: {check: "Ok."}
  }
};

const getConfidence = (context: SDSContext) => {
  let result = context.recResult[0].confidence;
  console.log(result);
  if (result > 0.8) {
    return true;
  } else {
    return false;
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
        CLICK:"init",
      },
    },
    init:{
      on:{
        TTS_READY:"welcome",
        CLICK:"welcome",
      },
    },
    welcome:{
      initial: "prompt",
      on:{
        RECOGNISED: [
          {
            target: "meeting",
            cond: (context) =>  (!!getEntity(context,"meeting") && getConfidence (context) === true),
            actions: assign({
              meeting:(context) => getEntity(context,"meeting"),
            }), 
          },
          {
            target: "personinfo",
            cond: (context) =>  (!!getEntity(context,"person")&& getConfidence (context) === true),
            actions: assign({
              person:(context) => getEntity(context,"person"),
            }), 
          },
          {
            target: "welcome_help",
            cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
            actions: assign({
              help:(context) => getEntity(context,"help"),
            }), 
          },
          {
          target: ".check",
          cond: (context) => getConfidence (context) === false,
          actions: assign({
            check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
          }),
          },
          {
            target:".nomatch"
          },
        ],     
        TIMEOUT: "reprompts",
      },
      states:{
        prompt:{
          entry: say("Hi Katharina! What are your plans today? Would you like to create a meeting or know more about a famous person?"),
          on:{ENDSPEECH:"ask"},
        },      
        ask:{
          entry:send ("LISTEN"),
        },
        hist: {
          type: "history",
          history: "deep"
         },
        nomatch:{
          entry:say("Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly."),
          on:{ENDSPEECH:"ask"},
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    welcome_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'You can say create a meeting or ask about someone.',
      })),
      on: { ENDSPEECH: "welcome" }, 
    },
    meeting: {
      entry: say("Alright"),
      on: { ENDSPEECH: "createmeeting" },
    },
    personinfo: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.person}.`,
      })),
      on: { ENDSPEECH: "person" }, 
      },
    person: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          { target: ".info",
            actions: assign({whois:  
              context => {return context.recResult[0].utterance}
            })   
            },
            {
              target: "person_help",
              cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
              actions: assign({
                help:(context) => getEntity(context,"help"),
              }), 
            },
            {
              target: ".check",
              cond: (context) => getConfidence (context) === false,
              actions: assign({
                check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
              }),
              },
          {
            target: ".nomatch",
          },
        ],   
        TIMEOUT: "reprompts"
      },
      states: {
        info: {
          invoke: {
            id: 'getInfo',
            src: (context, event) => kbRequest(context.whois),
            onDone: [{
              target: 'success',
              cond: (context, event) => event.data.Abstract !== "",
              actions: assign({ info: (context, event) => event.data })
            },
            {
              target: 'failure',
            },
          ],
            onError: {
              target: 'failure',
            }
          }
        },
        success: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Here is some information I found about this person ${context.whois} ${context.info.Abstract}`
          })),
          on: {ENDSPEECH: "#meetperson"}
        },
        failure: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Sorry, I can't find any information about ${context.whois}. Do you want to know something about someone else?`
          })),   
          on: { ENDSPEECH: "ask" },
        },
        prompt: {
          entry: say("About whom would you like to know more about?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly."
          ),
          on: { ENDSPEECH: "ask" },
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    person_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'You can say the name of the person you want to know more about.',
      })),
      on: { ENDSPEECH: "person" }, 
    },
    meetperson: {
      id:"meetperson",
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "refusemeeting",
            cond: (context) => (!!getEntity(context, "deny")&& getConfidence (context) === true),
            actions: assign({
              deny: (context) => getEntity(context, "deny"),
            }), 
          },
          {
            target: "acceptmeeting",
            cond: (context) => (!!getEntity(context, "confirm")&& getConfidence (context) === true),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }), 
          },
          {
            target: "meetperson_help",
            cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
            actions: assign({
              help:(context) => getEntity(context,"help"),
            }), 
          },
          {
            target: ".check",
            cond: (context) => getConfidence (context) === false,
            actions: assign({
              check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT:"reprompts"
      },
      states: {
        prompt: {
          entry: say("Do you want to meet them?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly."
          ),
          on: {ENDSPEECH: "prompt"},
        },
        help: {
          entry: say("You can say yes or no if you want to meet this person"),
          on: { ENDSPEECH: "#root.dm.meetperson.prompt" }, 
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    meetperson_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'If you want to meet them you can say yes.',
      })),
      on: { ENDSPEECH: "meetperson" }, 
    },
    refusemeeting: {
      entry: say("What a pity that you don't want to meet the person!"),
      on: { ENDSPEECH: "init" },
    },
    acceptmeeting: {
      entry: [
        say("Great! So let's schedule a meeting!"),
        assign((context) => ({title: `meeting with ${context.whois}`}))
      ],
      on: { ENDSPEECH: "whichday" },
      },
    createmeeting: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "Info",
            cond: (context ) => (!!getEntity(context, "title")&& getConfidence (context) === true),
            actions: assign({
              title: (context) => getEntity(context, "title"),
            }),
          },
          {
            target: "createmeeting_help",
            cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
            actions: assign({
              help:(context) => getEntity(context,"help"),
            }), 
          },
          {
            target: ".check",
            cond: (context) => getConfidence (context) === false,
            actions: assign({
              check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: "reprompts"
        
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
            "Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly."
          ),
          on: { ENDSPEECH: "ask" },
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    createmeeting_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'You can say the title of your meeting.',
      })),
      on: { ENDSPEECH: "createmeeting" }, 
    },
    Info: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `OK, ${context.title}`,
      })),
      on: { ENDSPEECH: "whichday" },
      },
    whichday: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "day",
            cond: (context) => (!!getEntity(context, "date")&& getConfidence (context) === true),
            actions: assign({
              date: (context) => getEntity(context, "date"),
            }), 
          },
          {
            target: "whichday_help",
            cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
            actions: assign({
              help:(context) => getEntity(context,"help"),
            }), 
          },
          {
            target: ".check",
            cond: (context) => getConfidence (context) === false,
            actions: assign({
              check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT:"reprompts"
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
          entry: say(
            "Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly."
          ),
          on: { ENDSPEECH: "ask" },
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    whichday_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'You can say the day of the meeting',
      })),
      on: { ENDSPEECH: "whichday" }, 
    },
    day: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `Your meeting is scheduled for ${context.date}`,
      })),
      on: { ENDSPEECH: "wholeday" },
    },
    wholeday: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "negative",
            cond: (context) => (!!getEntity(context, "deny")&& getConfidence (context) === true),
            actions: assign({
              deny: (context) => getEntity(context, "deny"),
            }), 
          },
          {
            target: "positive",
            cond: (context) => (!!getEntity(context, "confirm")&& getConfidence (context) === true),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }), 
          },
          {
            target: "wholeday_help",
            cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
            actions: assign({
              help:(context) => getEntity(context,"help"),
            }), 
          },
          {
            target: ".check",
            cond: (context) => getConfidence (context) === false,
            actions: assign({
              check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: "reprompts"
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
            "Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly"
          ),
          on: { ENDSPEECH: "ask" },
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    wholeday_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'If your meeting will take the whole day, you can say yes.',
      })),
      on: { ENDSPEECH: "wholeday" }, 
    },
    negative: {
      entry: say("Okay, so I won't schedule the meeting for the whole day."),
      on: { ENDSPEECH: "Time" },
    },
    positive: {
      entry: say("Okay, so I will schedule the meeting for the whole day."),
      on: { ENDSPEECH: "confirmwholeday" },
    },
    confirmwholeday: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "wholeDayPositive",
            cond: (context) => (!!getEntity(context, "confirm")&& getConfidence (context) === true),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }), 
          },
          {
            target: "wholeDayNegative",
            cond: (context) => (!!getEntity(context, "deny")&& getConfidence (context) === true),
            actions: assign({
              deny: (context) => getEntity(context, "deny"),
            }), 
          },
          {
            target: ".check",
            cond: (context) => getConfidence (context) === false,
            actions: assign({
              check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: "reprompts"
      },
      states: {
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Do you want me to create a meeting titled ${context.title}, on ${context.date} for the whole day?`,
          })),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, I do not understand. Do you want me to create a meeting for the whole day?"
          ),
          on: { ENDSPEECH: "ask" },
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    wholeDayPositive: {
      entry: say("Great! Yor meeting will be created now."),
      on: { ENDSPEECH: "meetingcreated" },
    },
    wholeDayNegative: {
      entry: say("What a pity! I won't schedule the meeting then. Let's start over again."),
      on: { ENDSPEECH: "welcome" },
    },
    Time: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "time",
            cond: (context) => (!!getEntity(context, "time")&& getConfidence (context) === true),
            actions: assign({
              time: (context) => getEntity(context, "time"),
            }), 
          },
          {
            target: "Time_help",
            cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
            actions: assign({
              help:(context) => getEntity(context,"help"),
            }), 
          },
          {
            target: ".check",
            cond: (context) => getConfidence (context) === false,
            actions: assign({
              check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: "reprompts"
      },
      states: {
        prompt: {
          entry: say("What time is it?"),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly."
          ),
          on: { ENDSPEECH: "ask" },
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    Time_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'You can say the time of the meeting',
      })),
      on: { ENDSPEECH: "Time" }, 
    },
    time: {
      entry: send((context) => ({
        type: "SPEAK",
        value: `The meeting time is ${context.time}`,
      })),
      on: { ENDSPEECH: "meetConfirm" },
    },
    meetConfirm: {
      initial: "prompt",
      on: {
        RECOGNISED: [
          {
            target: "meetingcreated",
            cond: (context) => (!!getEntity(context, "confirm")&& getConfidence (context) === true),
            actions: assign({
              confirm: (context) => getEntity(context, "confirm"),
            }), 
          },
          {
            target: "rethink",
            cond: (context) => (!!getEntity(context, "deny")&& getConfidence (context) === true),
            actions: assign({
              deny: (context) => getEntity(context, "deny"),
            }), 
          },
          {
            target: "meetConfirm_help",
            cond: (context) =>  (!!getEntity(context,"help")&& getConfidence (context) === true),
            actions: assign({
              help:(context) => getEntity(context,"help"),
            }), 
          },
          {
            target: ".check",
            cond: (context) => getConfidence (context) === false,
            actions: assign({
              check:(context: { recResult: { utterance: any; }[]; }) => context.recResult[0].utterance,
            }),
            },
          {
            target: ".nomatch",
          },
        ],
        TIMEOUT: "reprompts"
      },
      states: {
        prompt: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `Do you want me to create a meeting titled ${context.title}, on ${context.date} at ${context.time}?`,
          })),
          on: { ENDSPEECH: "ask" },
        },
        ask: {
          entry: send("LISTEN"),
        },
        nomatch: {
          entry: say(
            "Sorry, would you be so kind and repeat your utterance? I am not sure if I understood it correctly."
          ),
          on: { ENDSPEECH: "ask" },
        },
        check: {
          entry: send((context) => ({
            type: "SPEAK",
            value: `I think you said ${context.check}, but I am not sure. To reduce confusion, let's just start over again.`,
          })),
          on: { ENDSPEECH: "ask" },
        },
      },
    },
    meetConfirm_help: {
      entry: send((context) =>({
        type:"SPEAK",
        value:'If all the information is correct, you can say yes.',
      })),
      on: { ENDSPEECH: "meetConfirm" }, 
    },
    meetingcreated: {
      entry: say('Your meeting has been created.'),
      on: { ENDSPEECH: "init" },
    },
    rethink: {
      entry: say("Let's start over."),
      on: { ENDSPEECH: "welcome" },
    },
    reprompts: {
      entry: say("I am sorry, I didn't catch what you have said. Could you please say again your utterance?"),
      on: {
        ENDSPEECH: [
          {
            target: "init",
            cond: (context) => (context.counter) == 3,
          },
          {
            target: "welcome.hist",
            actions: choose([
              {
                cond: (context) => context.counter == null,
                actions: assign({
                  counter: (context) => 0
                }),
              },
              {
                cond: (context) => context.counter != null,
                actions: assign({ counter: (context) => context.counter +1 
                }),
              }
            ]),
          },
        ]
      }
    },
  },
};
const kbRequest = (text: string) =>
  fetch(
    new Request(
      `https://cors.eu.org/https://api.duckduckgo.com/?q=${text}&format=json&skip_disambig=1`
    )
  ).then((data) => data.json());
            
            