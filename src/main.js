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
  function ret(props) {
    let model;
    if (construct) {
      model = construct();
    }
    const self = {
      id: model ? model.id + '-' : '' + type + '-' + id++,
    };
    const rendered = render.call(self, props);
    // If we re-rendered then we need to re-bind events.
    // push this component id onto a queue along with the events to bind
    if (events) {
      rebindings[self.id] = events;
    }
    // TODO: when a dom tree is removed, are the listeners on those nodes removed?
    return injectId(self.id, rendered);
  }

  return ret;
}

let renderQueue = null;
function requestRender(rootId, component) {
  if (renderQueue == null) {
    renderQueue = [];
    requestAnimationFrame(render);
  }

  renderQueue.push([rootId, component]);
}

function render() {
  // TODO: this is where we would topologically sort and de-dupe parent-child renderings.
  // If a parent wants to render then don't call render on its children.
  // B/c the parent will re-render the child anyway.
  const operations = renderQueue;
  renderQueue = null;
  for (let op of operations) {
    // TODO: can we re-pass old props if the component itself requested re-render of itself?
    document.getElementById(op[0]).innerHTML = op[1]().__html__;
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

function event(component, cb) {
  // component has the id in it
  // we need to return a string that calls cb.
  // we can generate a new symbol
  // and stick it into our map.
  // how do we remove the old one(s) from our map?
  // we don't know when stuff is unmounted, do we?
  // or will our mutation observer tell us?
  // the user could do events based on selectors...
  // we can get handle the binding that way...
}

function injectId(id, html) {
  html.__html__ =
    html.__html__.replace(/\<([A-z]+)/, (match, c1) => `<${c1} id="${id}"`);
  console.log(html.__html__);
  return html;
}

function bind(component, data) {
  // How do we find component functions
  // for the given model?
  // in a map.

  // How do we find nodes?
  // Prefix ID search?
  // If no node exists, remove model -> component function mappings for that id
}

requestRender(
  'content',
  component(
    function App() {
      return html`<div>Heyoo!</div>`;
    },
    // add model getter.
    // model getters have to be stateless too then? :|
    // How does component local state work? Since they're pure functions...
    // Component local state in the relational local DB too?
    // And bound to that as the model?
    {
      '':  ['click', () => console.log('clicked')],
    },
  ),
);
