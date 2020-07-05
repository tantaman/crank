const sanitize = (value) => {
  if (value) {
    if (typeof value === "object" && value.__html__) {
      return value.__html__;
    }
    if (Array.isArray(value)) {
      return value.map(sanitize).join("");
    }
  }
  tempEl.textContent = value;
  return tempEl.innerHTML;
};
const html = (parts, ...values) => {
  return {
    __html__: parts
      .map((part, i) => {
        return part + (i < values.length ? sanitize(values[i]) : "");
      })
      .join(""),
  };
};

let rebindings = {};
let typeId = 0;
function component(
  render,
  constructOrEvents,
  constructOrNull,
) {
  let events;
  let construct;
  if (typeof constructOrEvents == 'object') {
    events = constructOrEvents;
  } else if (typeof constructOrEvents == 'function') {
    construct = constructOrEvents;
    constructOrNull = null;
  }
  if (constructOrNull) {
    construct = constructOrNull;
  }

  const type = render.name + '-' + typeId++;
  let id = 0;
  function ret(props, state) {
    let model;
    if (construct) {
      model = construct();
    }
    const self = {
      id: model ? model.id + '-' : '' + type + '-' + id++,
    };
    const rendered = render.call(self, props, state);
    // If we re-rendered then we need to re-bind events.
    // push this component id onto a queue along with the events to bind
    if (events) {
      rebindings[self.id] = events;
    }
    // TODO: when a dom tree is removed, are the listeners on those nodes removed?
    return injectId(self.id, rendered);
  }

  ret.symbol = Symbol(render.name);
  return ret;
}

let renderQueue = null;
function requestRender(rootId, component, props, state) {
  if (renderQueue == null) {
    renderQueue = [];
    requestAnimationFrame(render);
  }

  renderQueue.push([rootId, component, props, state]);
}

function render() {
  // TODO: this is where we would topologically sort and de-dupe parent-child renderings.
  // If a parent wants to render then don't call render on its children.
  // B/c the parent will re-render the child anyway.
  const operations = renderQueue;
  renderQueue = null;
  for (let [rootId, component, props, state] of operations) {
    // TODO: can we re-pass old props if the component itself requested re-render of itself?
    document.getElementById(rootId).innerHTML = component(props, state).__html__;
  }

  // TODO: go through rebindings and bind events
  rebindEvents(rebindings);;
  rebindings = {};
}

function rebindEvents(rebindings) {
  Object.keys(rebindings).forEach(
    rootId => {
      const events = rebindings[rootId];
      const eventSelectors = Object.keys(events);
      if (eventSelectors.length === 0) {
        return;
      }

      const rootElem = document.querySelector('#'+rootId);
      eventSelectors.forEach(selector => {
        const [event, handler] = events[selector];
        if (selector === '') {
          rootElem.addEventListener(event, handler);
          return;
        }
        for (node of rootElem.querySelectorAll(selector)) {
          node.addEventListener(event, handler)
        }
      })
    },
  );
}

function injectId(id, html) {
  html.__html__ =
    html.__html__.replace(/\<([A-z]+)/, (match, c1) => `<${c1} id="${id}"`);
  console.log(html.__html__);
  return html;
}

// We shouldn't need these as our state tree and lensing will handle it
const modelListeners = {};
function bind(component, data) {
  let listeners = modelListeners[data.id];
  if (listeners == null) {
    listeners = {};
    modelListeners[data.id] = listeners;
  }
  listeners[component.symbol] = component;
}

class State {
  constructor() {
    this._listener = null;
  }

  lense(name) {
    const old = this[name];
    if (old !== undefined) {
      return old;
    }
    return this[name] = new State();
  }

  destroy() {
    this._listener = null;
  }

  set(state) {
    // TODO: errors on overriding methods.
    Object.keys(state).forEach(k => this[k] = state[k]);
    this._listener();
  }
}

const button = component(
  function Button(props, state) {
    return html`<button>Click me!</button>`;
  },
  {
      '':  ['click', () => console.log('clicked')],
  },
);

requestRender(
  'content',
  component(
    function App(props, state) {
      return html`<div>Heyoo!<br />${button(null, state.lense('button'))}</div>`;
    },
    // add model getter.
    // model getters have to be stateless too then? :|
    // How does component local state work? Since they're pure functions...
    // Component local state in the relational local DB too?
    // And bound to that as the model?
  ),
  {},
  new State(),
);


/*
We can do lensing with a global variable.
On re-render, we hold "state" in a global and as `component` instances are called
we `lense` down.

But to handle the "Same component but rendered conditionally"
if (x) {
  <Poop />
}
<Poop />

We need a compile time conversion to symbolicate those components.

MyComp() {
  if (x) {
    <Poop symbol={this.symbols[0]} />
  }
  <Poop symbol={this.symbols[1]} />
}

Then the component function (which wraps poop) will lense based on the provided
symbol which was inject at compile time.

On re-renders we'll see if a given lense of the state map was not touched.
If not we know we can release it as the component was not rendered.

Since we'll have this state/lense/component tree we can use that to
manage components which are bound to models.

As a state is not lensed we know that component is unmounted and thus we
know it needs to unbind from any models it was bound to.
*/
