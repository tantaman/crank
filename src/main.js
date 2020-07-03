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

// Components can bind to their own objects and request their own updates.
// So rather than re-render the entire display we render components whose objects updated.
// local relational db.
// listen to the db records as they are committed.
// identity based on id.
// how do we fix event handling in this template mode?
// how about async functions for rendering?

function loaded() {
  console.log("loaded");
}

// Select the node that will be observed for mutations
const targetNode = document.getElementById("content");

// Options for the observer (which mutations to observe)
const config = {
  subtree: true,
  childList: true,
};

// Callback function to execute when mutations are observed
const callback = function (mutationsList, observer) {
  console.log(mutationsList);
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(targetNode, config);

// Beautifull!! We get mutation events of added children with the ids of these root components.
document.getElementById("content").innerHTML = `<div id="first">first</div>`;
document.getElementById("first").innerHTML = `<span id="z"><a>nest</a></span>`;
// document.getElementById("first").append("<span>append</span>");

// Later, you can stop observing
// observer.disconnect();

// can we use mutation observers and have a component map based on data id?

/*
Our component method can sear an ID into the string being returned.
We will record these ids in a map.
Then we can select all the nodes with those ids.
Then we can insert them all into our map of id -> component instance.

function() {

}

const App = component(() => {
  bind(this, dataModel);
  return html`
    <div onclick="${event(this, () => ...)}">${SubComponent()}</div>
  `;
});

App();
App.render();


*/

let typeId = 0;
function component(f) {
  const type = f.name + '~' + typeId++;
  let id = 0;
  return () => {
    const self = {
      id: type + '~' + id++,
    };
    while (true) {
      const rendered = f.apply(self, ...arguments);
      yield injectId(id, rendered);
    }
  };
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

/*
could type:
component(
  // render func. has a this that is the component
  (props) => ...,
  // events. has a this that is the component
  {
    button: (props) => ...,
  }
  // we bind events using the selectors scoped to the root id of the component.
);
*/

function injectId(id, html) {
  // regex to stick it into the first returned node.
  // what if the user wants to set an ID? meh. That shouldn't really happen much.
}

function bind(component, data) {
  // data is our "relational data" that the component will sync with whenever
  // an update to it is committed to the local db
  // What if we want ephemeral commits?

  // how will we unbind component from data?
  // occasional garbage collection routine to see if components still exist?
  // weak references?
  // can a dom node listen for its detachment?
  // or we can never directly bind. We can make our id prefixed by the data model's id and do querySelectors when a piece of data changes.

  // However, if we get a change event on some data model
  // only the parent most component should update and none of the siblings that also are bound to that same model.
  // So we need to track hierarchy.
}
