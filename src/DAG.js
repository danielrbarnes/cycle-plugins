'use strict';

/**
 * @overview Provides a directed acyclic graph to manage Plugin dependencies.
 * @author Daniel R Barnes
 */

import {Subject} from 'rxjs';
import {is} from './common.js';
import {Plugin} from './Plugin.js';
import {
    gt,
    uniq,
    concat,
    attempt,
    isEqual,
    isError,
    isInteger,
    isFunction,
    isUndefined,
    flattenDeep
} from 'lodash';

const
    Errors = {
        EXPECTED_FUNCTION_CALLBACK: 'Parameter `callback` must be a function.',
        EXPECTED_POSITIVE_CONCURRENCY: 'Parameter `concurrency` must be a positive integer.'
    },
    data = new WeakMap();

class Node {
    
    constructor(value) {
        this.value = value;
        this.children = [];
        this.parent = undefined;
    }
    
    size() {
        return this.children.length +
            this.children.reduce((res, child) =>
                res + child.size(), 0);
    }

    addChild(node) {
        if (!isUndefined(node.find(this))) {
            throw new Error(`Cycle detected between ${node.value.name} and ${this.value.name}.`);
        }
        if (!isUndefined(node.parent)) {
            node.parent.children.splice(node.parent.children.indexOf(node), 1);
        }
        this.children = uniq(concat(this.children, node));
        node.parent = this;
    }
    
    findByName(name) {
        if (this.value && isEqual(this.value.name, name)) {
            return this;
        }
        return this.children.reduce((result, child) => {
            return child.findByName(name) || result;
        }, undefined);
    }
    
    find(node) {
        if (isEqual(node, this)) {
            return this;
        }
        return this.children.reduce((result, child) => {
            return child.find(node) || result;
        }, undefined);
    }
    
    toString() {
        let name = this.value && this.value.name || 'root';
        return `${name} : [${this.children.join(', ')}]`;
    }
    
    toJSON() {
        return {
            name: this.value && this.value.name || 'root',
            children: this.children.map(child => child.toJSON())
        };
    }
    
}

export class DAG {

    /**
      * Provides a dependency-safe way to iterate through plugins.
      * @class DAG
      * @param {Plugin | Plugin[]} plugins One or more Plugin instances the DAG should manage.
      * @throws {Error} If a dependent Plugin is not optional and not in the set of Plugins
      *  provided to the constructor, an error will be thrown. You can mark a dependency as
      *  optional by prepending it with a question mark. See the documentation for Plugin
      *  for more information.
      * @example
      * var dag = new DAG(pluginA, pluginB, pluginC);
      * dag.forEach(function iterate(plugin, next) {
      *   // do something with plugin
      *   next(); // invoke this callback with the next plugin
      *   // if you wish to stop iteration immediately, invoke
      *   // next with an argument: next(0) or next('stop') or
      *   // next(new Error()) -- the argument will be passed
      *   // to your success handler function
      * }, function finished(err) {
      *   if (err) {
      *     console.log('An error occurred:', err);
      *   }
      * });
      */
    constructor(...plugins) {
        
        let root = new Node();
        data.set(this, root);
        
        uniq(flattenDeep(plugins))
            .filter(is(Plugin))
            .map(vertex => new Node(vertex))
            .forEach(node => root.addChild(node));

        concat(root.children).forEach(node => {
            node.value.after.forEach(after => {
                let [, opt, name] = after.match(/^(\??)(.+)$/),
                    target = root.findByName(name);
                if (isUndefined(target)) {
                    if (opt !== '?') {
                        throw new Error(`${node.value.name} must be after ${after}, which does not exist.`);
                    }
                } else {
                    target.addChild(node);
                    node = target; // may not be optimal
                }
            });
        });

    }
    
    /**
     * Converts the DAG into a dependency-safe sequence of Plugin instances.
     * @function DAG#toArray
     * @returns {Plugin[]} An array of Plugin instances in dependency-safe order.
     * @example
     * var dag = new DAG(pluginA, pluginB, pluginC);
     * var names = dag.toArray().map(function(plugin) {
     *   return plugin.name;
     * });
     * log(names);
     */
    toArray() {
        let result = [],
            append = (value, next) => {
                result.push(value);
                next();
            };
        this.forEach(append, null, 1);
        return result;
    }
    
    toJSON() {
        return data.get(this).toJSON();
    }

    toString() {
        return data.get(this).toString();
    }
    
    /**
     * Iterates through the DAG in dependency-safe order using
     * the specified callback function and concurrency settings.
     * @function DAG#forEach
     * @param {Function} callback A method that will be invoked
     *  for each Plugin instance. Arguments will be:
     *   - {Plugin} plugin - the current plugin
     *   - {Function} next - method to invoke to continue iteration
     *   - {Number} percent - a number between 0 and 100 indicating
     *      how much of the DAG has been processed
     * @param {Function} [finish] An optional method to invoke
     *  when the DAG has been completely processed. If an error
     *  has occurred or the iteration ended early, the only argument
     *  will be the exit reason.
     * @param {Number} [concurrency=5] How many Plugins to iterate
     *  concurrently. The number must be a positive integer.
     * @throws {Error} Parameter `callback` must be a function.
     * @throws {Error} Parameter `concurrency` must be a positive
     *  integer.
     * @example
     * new DAG(pluginA, pluginB, pluginC)
     *   .forEach((plugin, next, percent) => {
     *     log(`running ${plugin.name} - ${percent}% complete`);
     *     next('stop'); // stop iterating early
     *   }, err => {
     *     if (err) {
     *       log('stopped early because:', err);
     *     }
     *   });
     */
    forEach(callback, finish, concurrency = 5) {
        
        if (!isFunction(callback)) {
            throw new Error(Errors.EXPECTED_FUNCTION_CALLBACK);
        }
        
        if (!isInteger(concurrency) || !gt(concurrency, 0)) {
            throw new Error(Errors.EXPECTED_POSITIVE_CONCURRENCY);
        }
        
        let root = data.get(this),
            queue = concat(root.children),
            total = root.size(),
            finished = false,
            numRun = 0,
            active = 0,
            
            done = err => {
                if (!finished) {
                    finished = true;
                    if (isFunction(finish)) {
                        finish(err);
                    }
                }
            },
            
            getNext = node => {
                return err => {
                    numRun++;
                    active--;
                    if (!isUndefined(err)) {
                        return done(err);
                    }
                    if (!gt(total, numRun)) {
                        return done();
                    }
                    queue = concat(queue, node.children);
                    processNext();
                };
            },
            
            processNext = () => {

                queue.sort((a, b) => a.value.index - b.value.index);
                queue.splice(0, concurrency - active).forEach(node => {
                    
                    if (finished) {
                        return;
                    }

                    active++;

                    let plugin = node && node.value,
                        error = attempt(
                            callback,
                            plugin,
                            getNext(node),
                            Math.ceil(numRun / total * 100)
                        );

                    if (isError(error)) {
                        done(error);
                    }

                });

            };
        
        processNext();
        
    }
    
}