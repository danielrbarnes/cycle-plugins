# cycle-plugins
Provides observable-based plugins to cycle.js applications.

## Installation
`npm i cycle-store --save`

## Scripts
NOTE: Make sure you've installed all dependencies using `npm install` first.

To generate documentation: `npm run doc`. This will create documentation in the
`build/docs` folder.

To run unit tests: `npm test`

## API
### Plugins
Static class for registering and consuming Plugininstances dynamically.

**Kind**: global namespace  

* [Plugins](#Plugins) : <code>object</code>
    * [.register(plugins)](#Plugins+register)
    * [.unregister(plugin)](#Plugins+unregister)
    * [.get(criteria)](#Plugins+get)

<a name="Plugins+register"></a>
### plugins.register(plugins)
Makes one or more Plugins available to consumers.

**Kind**: instance method of <code>[Plugins](#Plugins)</code>  

| Param | Type | Description |
| --- | --- | --- |
| plugins | <code>[Plugin](#Plugin)</code> &#124; <code>[Array.&lt;Plugin&gt;](#Plugin)</code> | One or more  Plugin instances to make available to consumers. |

**Example**  
```js
Plugins.register(new Plugin({  name: 'console',  log: function log(msg) { ... }}));Plugins.get({name: 'console'}).first()  .tap(console => console.log('hello'));
```
<a name="Plugins+unregister"></a>
### plugins.unregister(plugin)
Makes a Plugin unavailable to consumers.

**Kind**: instance method of <code>[Plugins](#Plugins)</code>  

| Param | Type | Description |
| --- | --- | --- |
| plugin | <code>[Plugin](#Plugin)</code> | A single Plugin to make unavailable  to consumers. |

**Example**  
```js
var plugin = new Plugin({name: 'temp'});Plugins.register(plugin); // available to consumersPlugins.unregister(plugin); // unavailable to consumers
```
<a name="Plugins+get"></a>
### plugins.get(criteria)
Returns an Observable populated with an array ofPlugin instances matching the specified criteria.The array contains a utility method called `toDAG`that will return a DAG instance you can use toiterate safely over the returned Plugin instancesin a way that respects the `index` and `after`properties of each Plugin.

**Kind**: instance method of <code>[Plugins](#Plugins)</code>  
**Throws**:

- <code>Error</code> Invalid criteria was specified.


| Param | Type | Description |
| --- | --- | --- |
| criteria | <code>Object</code> | A map of criteria to apply  against each registered Plugin. Only Plugin instances  matching the specified criteria will be included in  the resulting Observable. |

**Example**  
```js
// retrieve a single Plugin by namevar single$ = Plugins.get({name: 'my-one-plugin'}).first();
```
**Example**  
```js
// retrieve all registered Plugin instancesvar allPlugins$ = Plugins.get(); // or Plugins.get({})
```
**Example**  
```js
// retrieve all Plugin instances targeting a specific typevar targeted$ = Plugins.get({targetType: MyClass});
```
**Example**  
```js
// retrieve Plugin instances matching a specific filter;// the Plugin would need 'my-criteria' in its `filter.any`// string array and NOT in its `filter.none` string array.var filtered$ = Plugins.get({filter: 'my-criteria'});
```
**Example**  
```js
// iterating through Plugins concurrently and in a// dependency-safe order:let savePlugins$ = Plugins.get({  targetType: MyClass, filter: 'save'});function save() {  return savePlugins$.map(plugins =>    new Observable(observer =>      plugins.toDAG().forEach(        (plugin, next) => plugin.doSomething(), next(),        (err) => err ? observer.error(err) : observer.next()      );    ));}
```

### Plugin
**Kind**: global class  
**Inherits**: <code>Broker</code>  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>String</code> |  | The name of this plugin. |
| index | <code>Number</code> | <code>0</code> | Provides a way to  order multiple Plugins whenever a sequence is  requested. |
| after | <code>Array.&lt;String&gt;</code> | <code>[]</code> | Provides a way to  order multiple Plugins based on dependencies.  Ensures that this Plugin will be sequenced after  the specified Plugin names. If you prepend a name  with ?, it will be treated as an optional dependency. |
| enabled | <code>Boolean</code> | <code>true</code> | Some consumers  may use this property to determine which Plugins  should be consumed or which can be skipped during  iteration. |
| targetType | <code>function</code> | <code>Object</code> | Used in  conjunction with Plugins.get to ensure both Plugin  creators and Plugin consumers agree on who can  consume this Plugin instance. |
| filter | <code>[Filter](#Filter)</code> | <code>{any:[], none:[]}</code> | A  way to restrict the list of Plugins retrieved by  Plugins.get at runtime. |

<a name="new_Plugin_new"></a>
### new Plugin(props)
An extensible object.


| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | A map of property names and  values to apply to the Plugin instance. The only  required property is `name`. |

**Example**  
```js
import {extend, matches} from 'lodash';const COMMAND_PROPS = { ... };class Command extends Plugin  constructor(props) {    super(extend({}, COMMAND_PROPS, props));    Plugins.register(this);  }  execute() {}  undo() {}}class RecordCommand extends Command {  constructor(props) {    super({      targetType: Record,      enabled: User.hasPrivilege(props.name)    });  }}class SaveRecord extends RecordCommand  constructor() {    super({name: 'save-record');  }  execute() { ... }  undo() { ... }}class DeleteRecord extends RecordCommand  constructor() {    super({name: 'delete-record');  }  execute() { ... }  undo() { ... }}class Record extends Broker {  constructor() {    this.commands$ = Plugins.get({      baseType: RecordCommand,      targetType: Record,      enabled: true    });  }  save() {    return this.commands$      .filter(matches({name: 'save-record'}))      .map(command => command.execute(this))      .tap(() => this.emit('record-saved'))      .toPromise();  }}
```

### DAG (Directed Acyclic Graph)
**Kind**: global class  

* [DAG](#DAG)
    * [new DAG(plugins)](#new_DAG_new)
    * [.toArray()](#DAG+toArray) ⇒ <code>[Array.&lt;Plugin&gt;](#Plugin)</code>
    * [.forEach(callback, [finish], [concurrency])](#DAG+forEach)

<a name="new_DAG_new"></a>
### new DAG(plugins)
Provides a dependency-safe way to iterate through plugins.

**Throws**:

- <code>Error</code> If a dependent Plugin is not optional and not in the set of Plugins provided to the constructor, an error will be thrown. You can mark a dependency as optional by prepending it with a question mark. See the documentation for Plugin for more information.


| Param | Type | Description |
| --- | --- | --- |
| plugins | <code>[Plugin](#Plugin)</code> &#124; <code>[Array.&lt;Plugin&gt;](#Plugin)</code> | One or more Plugin instances the DAG should manage. |

**Example**  
```js
var dag = new DAG(pluginA, pluginB, pluginC);dag.forEach(function iterate(plugin, next) {  // do something with plugin  next(); // invoke this callback with the next plugin  // if you wish to stop iteration immediately, invoke  // next with an argument: next(0) or next('stop') or  // next(new Error()) -- the argument will be passed  // to your success handler function}, function finished(err) {  if (err) {    console.log('An error occurred:', err);  }});
```
<a name="DAG+toArray"></a>
### daG.toArray() ⇒ <code>[Array.&lt;Plugin&gt;](#Plugin)</code>
Converts the DAG into a dependency-safe sequence of Plugin instances.

**Kind**: instance method of <code>[DAG](#DAG)</code>  
**Returns**: <code>[Array.&lt;Plugin&gt;](#Plugin)</code> - An array of Plugin instances in dependency-safe order.  
**Example**  
```js
var dag = new DAG(pluginA, pluginB, pluginC);var names = dag.toArray().map(function(plugin) {  return plugin.name;});log(names);
```
<a name="DAG+forEach"></a>
### daG.forEach(callback, [finish], [concurrency])
Iterates through the DAG in dependency-safe order usingthe specified callback function and concurrency settings.

**Kind**: instance method of <code>[DAG](#DAG)</code>  
**Throws**:

- <code>Error</code> Parameter `callback` must be a function.
- <code>Error</code> Parameter `concurrency` must be a positive integer.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| callback | <code>function</code> |  | A method that will be invoked  for each Plugin instance. Arguments will be:   - {Plugin} plugin - the current plugin   - {Function} next - method to invoke to continue iteration   - {Number} percent - a number between 0 and 100 indicating      how much of the DAG has been processed |
| [finish] | <code>function</code> |  | An optional method to invoke  when the DAG has been completely processed. If an error  has occurred or the iteration ended early, the only argument  will be the exit reason. |
| [concurrency] | <code>Number</code> | <code>5</code> | How many Plugins to iterate  concurrently. The number must be a positive integer. |

**Example**  
```js
new DAG(pluginA, pluginB, pluginC)  .forEach((plugin, next, percent) => {    log(`running ${plugin.name} - ${percent}% complete`);    next('stop'); // stop iterating early  }, err => {    if (err) {      log('stopped early because:', err);    }  });
```
