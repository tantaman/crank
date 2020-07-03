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

function component(f) {
  const type = TX++;
  // Can return a generator? Every generator will have "memory"?
  // The id can be persisted in the generator.
  // It'll yield the rendered thing and sear the same id over and over!
  // and have the same `this` and such and such and so on!
  return () => {
    const id = ...; // id always new?
    const rendered = f.apply({}, ...arguments);
    return injectId(id, rendered);
  };
}
*/
