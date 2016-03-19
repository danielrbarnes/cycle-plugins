'use strict';

/**
 * @overview Provides observable-based plugins to cycle.js applications.
 * @author Daniel R Barnes
 */

import {DAG} from './DAG.js';
import {Plugin} from './Plugin.js';
import {BehaviorSubject, Observable} from 'rxjs';

import {
    is,
    Errors,
    isFilterMatch
} from './common.js';

import {
    bind,
    negate,
    defaults,
    identity,
    isEqual,
    isEmpty,
    isString,
    isEqualWith,
    isUndefined,
    partial,
    overSome,
    flattenDeep
} from 'lodash';

const
    items = new Set(),
    subject = new BehaviorSubject([]),
    update = () => subject.next(Array.from(items)),
    defaultCriteria = {
        baseType: Plugin,
        targetType: Object,
        enabled: undefined,
        filter: undefined
    };

/**
 * Static class for registering and consuming Plugin
 * instances dynamically.
 * @namespace Plugins
 */
export class Plugins {

    /**
     * Makes one or more Plugins available to consumers.
     * @function Plugins#register
     * @alias Plugins#add
     * @param {Plugin | Plugin[]} plugins One or more
     *  Plugin instances to make available to consumers.
     * @example
     * Plugins.register(new Plugin({
     *   name: 'console',
     *   log: function log(msg) { ... }
     * }));
     *
     * Plugins.get({name: 'console'}).first()
     *   .tap(console => console.log('hello'));
     */
    static register(...plugins) {
        let anyAdded = false;
        flattenDeep(plugins)
            .filter(is(Plugin))
            .filter(negate(bind(items.has, items)))
            .forEach(plugin => {
                anyAdded = true;
                items.add(plugin);
                plugin.on(Plugin.CHANGED, update);
            });
        if (anyAdded) {
            update();
        }
    }
    
    /**
     * Makes a Plugin unavailable to consumers.
     * @function Plugins#unregister
     * @alias Plugins.remove
     * @param {Plugin} plugin A single Plugin to make unavailable
     *  to consumers.
     * @example
     * var plugin = new Plugin({name: 'temp'});
     * Plugins.register(plugin); // available to consumers
     * Plugins.unregister(plugin); // unavailable to consumers
     */
    static unregister(plugin) {
        if (!items.has(plugin)) {
            return;
        }
        items.delete(plugin);
        update();
    }
    
    /**
     * Returns an Observable populated with an array of
     * Plugin instances matching the specified criteria.
     * The array contains a utility method called `toDAG`
     * that will return a DAG instance you can use to
     * iterate safely over the returned Plugin instances
     * in a way that respects the `index` and `after`
     * properties of each Plugin.
     * @function Plugins#get
     * @param {Object} criteria A map of criteria to apply
     *  against each registered Plugin. Only Plugin instances
     *  matching the specified criteria will be included in
     *  the resulting Observable.
     * @throws {Error} Invalid criteria was specified.
     * @example
     * // retrieve a single Plugin by name
     * var single$ = Plugins.get({name: 'my-one-plugin'}).first();
     * @example
     * // retrieve all registered Plugin instances
     * var allPlugins$ = Plugins.get(); // or Plugins.get({})
     * @example
     * // retrieve all Plugin instances targeting a specific type
     * var targeted$ = Plugins.get({targetType: MyClass});
     * @example
     * // retrieve Plugin instances matching a specific filter;
     * // the Plugin would need 'my-criteria' in its `filter.any`
     * // string array and NOT in its `filter.none` string array.
     * var filtered$ = Plugins.get({filter: 'my-criteria'});
     * @example
     * // iterating through Plugins concurrently and in a
     * // dependency-safe order:
     * let savePlugins$ = Plugins.get({
     *   targetType: MyClass, filter: 'save'
     * });
     *
     * function save() {
     *   return savePlugins$.map(plugins =>
     *     new Observable(observer =>
     *       plugins.toDAG().forEach(
     *         (plugin, next) => plugin.doSomething(), next(),
     *         (err) => err ? observer.error(err) : observer.next()
     *       );
     *     ));
     * }
     */
    static get(criteria = {}) {
        defaults(criteria, defaultCriteria);
        if (isString(criteria.targetType)) {
            throw new Error(Errors.INVALID_CRITERIA_TARGET);
        }
        return new Observable(function PluginObservable(observer) {
            let firstTime = true;
            subject.subscribe(plugins => {
                let result = plugins.filter(plugin => {
                    let {name, filter, enabled, targetType} = plugin,
                        matchesName = overSome(
                            isUndefined,
                            partial(isEqual, name)
                        ),
                        matchesEnabled = overSome(
                            isUndefined,
                            partial(isEqual, enabled)
                        );
                    return matchesName(criteria.name) &&
                        matchesEnabled(criteria.enabled) &&
                        is(criteria.baseType)(plugin) &&
                        is(targetType)(criteria.targetType) &&
                        isFilterMatch(filter, criteria.filter);
                });
                if (firstTime && isEmpty(result)) {
                    return; // don't publish the initial empty array
                }
                firstTime = false;
                result.sort((a, b) => a.index - b.index);
                result.toDAG = () => new DAG(...plugins);
                observer.next(result);
            });
        }).distinctUntilChanged(identity, isEqualWith);
    }
    
    static clear() {
        items.clear();
        update();
    }
    
}

Plugins.add = Plugins.register;
Plugins.remove = Plugins.unregister;
