
// See knockout/src/binding/bindingProvider.js

function secureBindingsProvider(options) {
    var existingProvider = new ko.bindingProvider();
    options = options || {};

    // override the attribute
    this.attribute = options.attribute || "data-sbind";

    // do we bind to the ko: virtual elements
    this.noVirtualElements = options.noVirtualElements || false;

    // set globals
    this.globals = options.globals || {};

    // the binding classes -- defaults to ko bindingsHandlers
    this.bindings = options.bindings || ko.bindingHandlers;

    // A cache across the bindings provider instance.
    this.cache = {}
}

function registerBindings(newBindings) {
    ko.utils.extend(this.bindings, newBindings);
}

function nodeHasBindings(node) {
    var value;
    if (node.nodeType === node.ELEMENT_NODE) {
        return node.getAttribute(this.attribute) ||
            (ko.components && ko.components.getComponentNameForNode(node));
    } else if (node.nodeType === node.COMMENT_NODE) {
        if (this.noVirtualElements) {
            return false;
        }
        value = ("" + node.nodeValue || node.text).trim();
        // See also: knockout/src/virtualElements.js
        return value.indexOf("ko ") === 0;
    }
}

function getBindingsString(node) {
    switch (node.nodeType) {
        case node.ELEMENT_NODE:
            return node.getAttribute(this.attribute);
        case node.COMMENT_NODE:
            return _virtualNodeBindingValue(node);
        default:
            return null;
    }
}

function nodeParamRawMapper(param) {
    return param();
}

function nodeParamsToObject(node, parser) {
    var accessors = parser.parse(node.getAttribute('params'));
    if (!accessors || Object.keys(accessors).length === 0) {
        return {$raw: {}};
    }
    var $raw = _object_map(accessors, nodeParamRawMapper);
    var params = _object_map($raw, ko.unwrap);
    if (!params.hasOwnProperty('$raw')) {
        params.$raw = $raw;
    }
    return params;
}


// Note we do not seem to need both getBindings and getBindingAccessors; just
// the latter appears to suffice.
//
// Return the name/valueAccessor pairs.
// (undocumented replacement for getBindings)
// see https://github.com/knockout/knockout/pull/742
function getBindingAccessors(node, context) {
    var bindings = {},
        component_name,
        parser = new Parser(node, context, this.globals),
        sbind_string = this.getBindingsString(node);

    if (node.nodeType === node.ELEMENT_NODE && ko.components) {
        component_name = ko.components.getComponentNameForNode(node);
    }

    if (sbind_string) {
        bindings = this.cache[sbind_string];
        if (!bindings) {
            bindings = this.cache[sbind_string]
                = parser.parse(sbind_string || '');
        }
    }

    // emulate ko.components.addBindingsForCustomElement(bindings, node,
    //     context, true);
    if (component_name) {
        if (bindings.component) {
            throw new Error("Cannot use a component binding on custom elements");
        }
        var componentBindingValue = {
            'name': component_name,
            'params': nodeParamsToObject(node, parser),
        };
        bindings.component =  function() { return componentBindingValue; };
    }

    return bindings;
}


ko.utils.extend(secureBindingsProvider.prototype, {
    registerBindings: registerBindings,
    nodeHasBindings: nodeHasBindings,
    getBindingAccessors: getBindingAccessors,
    getBindingsString: getBindingsString,
    nodeParamsToObject: nodeParamsToObject,
    Parser: Parser
});
