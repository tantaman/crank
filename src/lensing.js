(function() {
  let constructorGuard = false;
  const tempEl = document.createElement('div');
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
    function ret(props, state, isRooted) {
      let self;
      if (this !== globalThis) {
        self = this;
      } else {
        self = {
          id: type + '-' + id++,
          props,
          state,
        };
        if (construct) {
          construct(self);
        }
      }

      constructorGuard = true;
      const rendered = render.call(self, props, state);
      constructorGuard = false;

      // If this !== self then the component has remounted.
      if (events && this !== self) {
        rebindings[self.id] = [self, events];
      }

      state._listener = () => {
        requestRender(self, ret);
      };

      // TODO: when a dom tree is removed, are the listeners on those nodes removed?
      if (!isRooted) {
        return injectId(self.id, rendered);
      }
      return rendered;
    }

    ret.symbol = Symbol(render.name);
    return ret;
  }

  let renderQueue = null;
  function requestRender(instance, renderFunc) {
    if (renderQueue == null) {
      renderQueue = [];
      requestAnimationFrame(render);
    }

    renderQueue.push([instance, renderFunc]);
  }

  function render() {
    // TODO: this is where we would topologically sort and de-dupe parent-child renderings.
    // If a parent wants to render then don't call render on its children.
    // B/c the parent will re-render the child anyway.
    const operations = renderQueue;
    renderQueue = null;
    for (let [instance, renderFunc] of operations) {
      document.getElementById(instance.id).innerHTML
        = renderFunc.call(instance, instance.props, instance.state, true).__html__;
    }

    // ^^ Post rendering here all of the lensing would have happened.
    // so we can tell the root state node to `purge`
    // and it'll purge anything untouched and re-set itself.
    // state._clean();

    // TODO: go through rebindings and bind events
    rebindEvents(rebindings);
    rebindings = {};
  }

  function rebindEvents(rebindings) {
    Object.keys(rebindings).forEach(
      rootId => {
        const [instance, events] = rebindings[rootId];
        const eventSelectors = Object.keys(events);
        if (eventSelectors.length === 0) {
          return;
        }

        const rootElem = document.querySelector('#'+rootId);
        eventSelectors.forEach(selector => {
          const [event, handler] = events[selector];
          const fn = (...args) => handler.apply(instance, args);
          if (selector === '') {
            rootElem.addEventListener(event, fn);
            return;
          }
          for (node of rootElem.querySelectorAll(selector)) {
            node.addEventListener(event, fn)
          }
        })
      },
    );
  }

  // We might actually need to wrap the component with our own tag and
  // id instead...
  // but only if we aren't re-rendering.
  // b/c otherwise its already in the dom.
  // and style with https://css-tricks.com/get-ready-for-display-contents/
  function injectId(id, html) {
    html.__html__ =
      '<div style="display: contents;" id="'+id+'">' + html.__html__ + '</div>';
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

  // State needs to track that which was touched
  // on the current render loop.
  // Then purge that which was not.
  // State can even have a reference to the "instance" of the component
  class State {
    constructor() {
      this._listener = null;
      this._touched = {};
      this._lenses = {};
    }

    lense(name) {
      const entry = this._lenses[name]
      this._touched[name] = true;
      if (entry !== undefined) {
        return entry;
      }
      return this._lenses[name] = new State();
    }

    _destroy() {
      this._listener = null;
      Object.keys(this._lenses).forEach(lense => this._lenses[lense]._destory());
      this._lenses = this._touched = null;
    }

    set(state) {
      // TODO: errors on overriding methods.
      Object.keys(state).forEach(k => this[k] = state[k]);
      if (!constructorGuard) {
        this._listener();
      }
    }

    _clean() {
      Object.keys(this._lenses).forEach(lense => {
        if (!lense in this._touched) {
          this._lenses[lense]._destory();
          delete this._lenses[lense];
        }
      });
      this._touched = {};
    }

    // Let components attach a "destroy" method to the instance?
    // that will have cleanup code to run when the component
    // is unmounted and state removed.
  }

  const exports = {
    component,
    requestRender,
    html,
    State,
  };
  if (typeof module !== 'undefined') {
    module.exports = exports;
  }

  this.lensing = exports;
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
})();
