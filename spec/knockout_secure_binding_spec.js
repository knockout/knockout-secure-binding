/*
TODO: comments
see eg https://github.com/rniemeyer/knockout-classBindingProvider/blob/master/spec/knockout-classBindingProvider.spec.js
*/

describe("Knockout Secure Binding", function () {
    var instance,
        Parser,
        Expression,
        Identifier,
        Node,
        operators,
        csp_rex = /Content Security Policy|blocked by CSP/;

    beforeEach(function () {
        instance = new ko.secureBindingsProvider();
        Parser = instance.Parser,
        Identifier = Parser.Identifier,
        Expression = Parser.Expression,
        Node = Parser.Node,
        operators = Node.operators;
    })

    // it("Has a built-in delay", function (done) {
    //   // we use this to make sure our test driver will actually
    //   // work when the results are slow (who tests the testers?)
    //   setTimeout(function () { done () }, 1000)
    // })

    it("has loaded knockout", function () {
        assert.property(window, 'ko')
    })

    it("secureBindingsProvider exist on 'ko'", function () {
        // note that it could alternatively be exported with `require`
        assert.property(ko, 'secureBindingsProvider')
    })

    it("has eval or new Function throw a CSP error", function () {
        var efn = function () { return eval("true") },
            nfn = function () { new Function("return true") };

        console.log("Expecting a CSP violation ...")
        assert.throw(efn, csp_rex)
        console.log("Expecting a CSP violation ...")
        assert.throw(nfn, csp_rex)
    })

    it("will throw an CSP error with regular bindings", function () {
        var div = document.createElement("div"),
            fn = function () {
                ko.applyBindings({obs: 1}, div)
            };

        // Although we cannot disable the CSP-violations, printing to the
        // console, we can print a lead-in that makes it appear to be
        // expected.
        console.log("Expecting a CSP violation ...")
        div.setAttribute("data-bind", "text: obs"),
        ko.bindingProvider.instance = new ko.bindingProvider()
        assert.throw(fn, csp_rex)
    })

    it("provides a binding provider", function () {
        ko.bindingProvider.instance = new ko.secureBindingsProvider();
    })

    describe("nodeHasBindings", function() {
        it("identifies elements with data-sbind", function () {
            var div = document.createElement("div")
            div.setAttribute("data-sbind", "x")
            assert.ok(instance.nodeHasBindings(div))
        })

        it("does not identify elements without data-sbind", function () {
            var div = document.createElement("div")
            div.setAttribute("data-bind", "x")
            assert.notOk(instance.nodeHasBindings(div))
        })
    })

    describe("getBindingAccessors with string arg", function() {
        var div;

        beforeEach(function() {
            ko.bindingProvider.instance = new ko.secureBindingsProvider()
            div = document.createElement("div");
            instance.bindings.alpha = {
                init: sinon.spy(),
                update: sinon.spy()
            }
        });

        it("reads multiple bindings", function () {
            div.setAttribute("data-sbind", 'a: 123, b: "456"')
            var bindings = instance.getBindingAccessors(div);
            assert.equal(Object.keys(bindings).length, 2, 'len')
            assert.equal(bindings['a'](), 123, 'a')
            assert.equal(bindings['b'](), "456", 'b')
        });

        it("escapes strings", function () {
            div.setAttribute("data-sbind", 'a: "a\\"b", b: \'c\\\'d\'')
            var bindings = instance.getBindingAccessors(div);
            assert.equal(Object.keys(bindings).length, 2, 'len')
            assert.equal(bindings['a'](), "a\"b", 'a')
            assert.equal(bindings['b'](), "c\'d", 'b')
        })

        it("returns a name/valueAccessor pair", function () {
            div.setAttribute("data-sbind", 'alpha: "122.9"');
            var bindings = instance.getBindingAccessors(div);
            assert.equal(Object.keys(bindings).length, 1, 'len')
            assert.isFunction(bindings['alpha'], 'is accessor')
            assert.equal(bindings['alpha'](), "122.9", '122.9')
        });

        it("becomes the valueAccessor", function () {
            div.setAttribute("data-sbind", 'alpha: "122.9"');
            var i_spy = instance.bindings.alpha.init,
                u_spy = instance.bindings.alpha.update,
                args;
            ko.applyBindings({vm: true}, div);
            assert.equal(i_spy.callCount, 1, "i_spy cc");
            assert.equal(u_spy.callCount, 1, "u_spy cc");
            args = i_spy.getCall(0).args;

            assert.equal(args[0], div, "u_spy div == node")
            assert.equal(args[1](), "122.9", "valueAccessor")
            // args[2] == allBindings
            assert.deepEqual(args[3], {vm: true}, "view model")

        })
    })

    describe("getBindingAccessors with function arg", function () {
        var div;

        beforeEach(function() {
            ko.bindingProvider.instance = new ko.secureBindingsProvider()
            div = document.createElement("div");
            div.setAttribute("data-sbind", 'alpha: x');
            instance.bindings.alpha = {
                init: sinon.spy(),
                update: sinon.spy()
            }
        });

        it("returns a name/valueAccessor pair", function () {
            var bindings = instance.getBindingAccessors(div);
            assert.equal(Object.keys(bindings).length, 1)
            assert.isFunction(bindings['alpha'])
        });

        it("becomes the valueAccessor", function () {
            var i_spy = instance.bindings.alpha.init,
                u_spy = instance.bindings.alpha.update,
                args;
            ko.applyBindings({x: 0xDEADBEEF}, div);
            assert.equal(i_spy.callCount, 1, "i_spy cc");
            assert.equal(u_spy.callCount, 1, "u_spy cc");
            args = i_spy.getCall(0).args;

            assert.equal(args[0], div, "u_spy div == node")
            assert.equal(args[1](), 0xDEADBEEF, "valueAccessor")
            // args[2] == allBindings
            assert.deepEqual(args[3],  {x: 0xDEADBEEF}, "view model")
        })
    })

    describe("Knockout's bindings", function () {
        beforeEach(function () {
            ko.bindingProvider.instance = new ko.secureBindingsProvider()
        })

        it("binds Text with data-sbind", function () {
            var div = document.createElement("div")
            div.setAttribute("data-sbind", "text: obs")
            ko.applyBindings({obs: ko.observable("a towel")}, div)
            assert.equal(div.textContent, "a towel")
        })

        it("sets attributes to constants", function () {
            var div = document.createElement("div"),
                context = { aTitle: "petunia plant" };
            div.setAttribute("data-sbind", "attr: { title: aTitle }")
            ko.applyBindings(context, div)
            assert.equal(div.getAttribute("title"), context.aTitle)
        })

        it("sets attributes to observables in objects", function () {
            var div = document.createElement("div"),
                context = { aTitle: ko.observable("petunia plant") };
            div.setAttribute("data-sbind", "attr: { title: aTitle }")
            ko.applyBindings(context, div)
            assert.equal(div.getAttribute("title"), context.aTitle())
        })

        it("registers a click event", function () {
            var div = document.createElement("div"),
                called = false,
                context = { cb: function () { called = true; } }
            div.setAttribute("data-sbind", "click: cb")
            ko.applyBindings(context, div)
            assert.equal(called, false, "not called")
            div.click()
            assert.equal(called, true)
        })
    })

    describe("Virtual elements", function() {
        beforeEach(function () {
            ko.bindingProvider.instance = new ko.secureBindingsProvider({virtualAttribute: "ko "})
        })

        it("binds Text in virtual element", function () {
            var div = document.createElement("div")
            div.innerHTML = "<!-- ko text: obs --> <!-- /ko -->"
            ko.applyBindings({obs: ko.observable("a towel")}, div)
            var indexOk = div.innerHTML.indexOf("a towel") > 0
            assert.ok(indexOk)
        })
    })

    describe("The lookup of variables (get_lookup_root)", function () {
        it("accesses the context", function () {
            var binding = "a: x",
                context = { x: 'y' },
                bindings = new Parser(null, context).parse(
                    binding);
            assert.equal(bindings.a(), "y");
        })

        it("accesses the globals", function () {
            var binding = "a: z",
                globals = { z: "ZZ" },
                bindings = new Parser(null, {}, globals).parse(
                    binding);
            assert.equal(bindings.a(), globals.z)
        })

        it("accesses $data.value and value", function () {
            var binding = "x: $data.value, y: value",
                context = { '$data': { value: 42 }},
                bindings = new Parser(null, context).parse(
                    binding);
            assert.equal(bindings.x(), 42)
            assert.equal(bindings.y(), 42)
        })

        it("ignores spaces", function () {
            var binding = "x: $data  .  value, y: $data\n\t\r . \t\r\nvalue",
                context = { '$data': { value: 42 }},
                bindings = new Parser(null, context).parse(
                    binding);
            assert.equal(bindings.x(), 42)
            assert.equal(bindings.y(), 42)
        })

        it("looks up nested elements in objects", function () {
            var binding = "x: { y: { z: a.b.c } }",
                context = { 'a': { b: { c: 11 }}},
                bindings = new Parser(null, context).parse(
                    binding);
            assert.equal(bindings.x().y.z, 11)
        })

        it("does not have access to `window` globals", function () {
            var binding = "x: window, y: global, z: document",
                bindings = new Parser(null, context).parse(
                    binding);
            assert.equal(bindings.x(), undefined)
            assert.equal(bindings.y(), undefined)
            assert.equal(bindings.z(), undefined)
        })

        it("recognizes $context", function () {
            var binding = "x: $context.value, y: value",
                context = { value: 42 },
                bindings = new Parser(null, context).parse(
                    binding);
            assert.equal(bindings.x(), 42)
            assert.equal(bindings.y(), 42)
        })

        it("recognizes $element", function () {
            var binding = "x: $element.id",
                node = { id: 42 },
                bindings = new Parser(node, {}).parse(
                    binding);
            assert.equal(bindings.x(), node.id)
        })

        it("accesses $data before $context", function () {
            var binding = "x: value",
                context = { value: 21, '$data': { value: 42 }},
                bindings = new Parser(null, context).parse(
                    binding);
            assert.equal(bindings.x(), 42)
        })

        it("accesses $context before globals", function () {
            var binding = "a: z",
                context = { z: 42 },
                globals = { z: 84 },
                bindings = new Parser(null, context,
                    globals).parse(binding);
            assert.equal(bindings.a(), 42)
        })

        // SKIP FIXME / TODO
        it("does not bleed globals", function () {
            var binding = "a: z",
                globals_1 = {z: 168},
                globals_2 = {},
                bindings_1 = new Parser(null, context,
                    globals_1).parse(binding),
                bindings_2 = new Parser(null, context,
                    globals_2).parse(binding);
            assert.equal(bindings_1.a(), 168)
            assert.equal(bindings_2.a(), undefined)
        })
    })

    describe("the build_tree function", function () {
        var nodes_to_tree;

        beforeEach(function () {
            nodes_to_tree = Expression.prototype.build_tree;
        })

        it("converts a simple array to a tree", function () {
            var nodes = ['a', operators['*'], 'b'],
                tree = nodes_to_tree(nodes.slice(0));
                // we use nodes.slice(0) to make a copy.
            assert.equal(tree.lhs, 'a');
            assert.equal(tree.rhs, 'b');
            assert.equal(tree.op, operators['*']);
        })

        it("converts multiple * to a tree", function () {
            var nodes = ['a', operators['*'], 'b', operators['/'], 'c'],
                tree = nodes_to_tree(nodes.slice(0));
            assert.equal(tree.lhs, 'a');
            assert.equal(tree.op, operators['*']);
            assert.equal(tree.rhs.lhs, 'b');
            assert.equal(tree.rhs.op, operators['/']);
            assert.equal(tree.rhs.rhs, 'c');
        })

        it("converts a complex set as expected", function () {
            var nodes = [
                'a', operators['*'], 'b',
                operators['+'],
                'c', operators['*'], 'd', operators['*'], 'e',
                operators['>'],
                'f', operators['+'], 'g', operators['%'], 'h',
            ],
                root = nodes_to_tree(nodes.slice(0));
            assert.equal(root.op, operators['>'], '>')

            assert.equal(root.lhs.op, operators['+'], '+')
            assert.equal(root.lhs.lhs.op, operators['*'], '*')
            assert.equal(root.lhs.lhs.lhs, 'a')
            assert.equal(root.lhs.lhs.rhs, 'b')

            assert.equal(root.lhs.rhs.op, operators['*'], '*')
            assert.equal(root.lhs.rhs.lhs, 'c')
            assert.equal(root.lhs.rhs.rhs.lhs, 'd')
            assert.equal(root.lhs.rhs.rhs.rhs, 'e')

            assert.equal(root.rhs.op, operators['+'], 'rhs +')
            assert.equal(root.rhs.lhs, 'f')

            assert.equal(root.rhs.rhs.op, operators['%'])
            assert.equal(root.rhs.rhs.lhs, 'g')
            assert.equal(root.rhs.rhs.rhs, 'h')
        })

        it("converts function calls (a())", function () {
            var context = { x: function () { } },
                parser, nodes, root;
            parser = new Parser(null, context);
            nodes = [
                new Identifier('x', parser),
                operators['()'],
                undefined
            ];
            root = nodes_to_tree(nodes.slice(0));

            assert.equal(root.lhs, nodes[0])
            assert.equal(root.op, operators['()'])
        })

        it("converts a string of function calls (a().b())", function () {
            var y = function () { return 'z' },
                x = function () { return { y: y } },
                context = { x: x },
                parser, node, root;

            parser = new Parser(null, context);

            nodes = [
                new Identifier('x', parser),
                operators['()'],
                undefined,
                operators['.'],
                new Identifier('y', parser),
                operators['()']
            ];

            root = nodes_to_tree(nodes.slice(0));

            assert.equal(root.lhs.lhs, nodes[0])
            assert.equal(root.lhs.op, operators['()'])
            assert.equal(root.op, operators['.'])
            assert.equal(root.rhs.lhs, nodes[4])
            assert.equal(root.rhs.op, operators['()'])
        })
    })

    describe("Node", function () {
        var context, parser, identifiers,
            f = function () { return 'Z' },
            ff = function () { return { fr: f } },
            g = function () { return { c: 'gY' }};

        beforeEach(function () {
            context = { f: f, ff: ff, g:g, c: 'Y' }
            parser = new Parser(null, context)
            identifiers = {
                f: new Identifier("f", parser),
                ff: new Identifier("ff", parser),
                fr: new Identifier("fr", parser),
                g: new Identifier("g", parser),
            }
        })

        it("gets a value for f()", function () {
            var root;
            root = new Node(identifiers.f, operators['()'])
            assert.equal(root.get_node_value(), 'Z')
        })

        it("gets a value for g().c", function () {
            var root, lhs;
            lhs = new Node(identifiers.g, operators['()'])
            root = new Node(lhs, operators['.'], "c")
            assert.equal(root.get_node_value(), 'gY')
        })

        it("gets value for ff().fr()", function () {
            var root;
            root = new Node(undefined, operators['.'])
            root.lhs = new Node(identifiers.ff, operators['()'])
            root.rhs = new Node(identifiers.fr, operators['()'])
            assert.equal(root.get_node_value(), 'Z')
        })

    })

    describe("the bindings parser", function () {
        it("parses bindings with JSON values", function () {
            var binding_string = 'a: "A", b: 1, c: 2.1, d: ["X", "Y"], e: {"R": "V"}, t: true, f: false, n: null',
            value = new Parser(null, {}).parse(binding_string);
            assert.equal(value.a(), "A", "string");
            assert.equal(value.b(), 1, "int");
            assert.equal(value.c(), 2.1, "float");
            assert.deepEqual(value.d(), ["X",  "Y"], "array");
            assert.deepEqual(value.e(), {"R": "V"}, "object");
            assert.equal(value.t(), true, "true");
            assert.equal(value.f(), false, "false");
            assert.equal(value.n(), null, "null");
        })

        it("parses an array of JSON values", function () {
            var binding = "x: [1, 2.1, true, false, null, undefined]",
                bindings = new Parser(null, {}).parse(
                    binding);
            assert.deepEqual(bindings.x(), [1, 2.1, true, false, null, undefined])
        })

        it("undefined keyword works", function () {
            var value = new Parser(null, {}).parse(
                    "y: undefined");
            assert.equal(value.y(), void 0);
        })

        it("parses single-quote strings", function () {
            var binding = "text: 'st\\'r'",
                bindings = new Parser(null, {}).parse(
                    binding);
            assert.equal(bindings.text(), "st'r")
        })

        it("parses text: {object: 'string'}", function () {
            var binding = "text: {object: 'string'}",
                bindings = new Parser(null, {}).parse(binding);
            assert.deepEqual(bindings.text(), { object: "string" })
        })

        it("parses object: attr: {name: value}", function () {
            var binding = "attr: { klass: kValue }",
                context = { kValue: 'Sam' }
                bindings= new Parser(null, context).parse(binding);
            assert.equal(bindings.attr().klass, 'Sam')
        })

        it("parses object: attr: {name: ko.observable(value)}", function () {
            var binding = "attr : { klass: kValue }",
                context = { kValue: ko.observable('Gollum') }
                bindings= new Parser(null, context).parse(binding);
            assert.equal(bindings.attr().klass(), 'Gollum')
        })

        it("parses object: attr: {n1: v1, n2: v2}", function () {
            var binding = "attr : { a: x, b: y }",
                context = { x: 'Real', y: 'Imaginary' }
                bindings= new Parser(null, context).parse(binding);
            assert.equal(bindings.attr().a, 'Real')
            assert.equal(bindings.attr().b, 'Imaginary')
        })
    })

    describe("the parsing of expressions", function () {
        it("works with explicit braces ( )", function () {
            var binding = "attr : (x)",
                context = { x: 'spot' }
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.attr(), 'spot')
        })

        it("computes a + b", function () {
            var binding = "text: a + b",
                context = { a: 1, b: 2 },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.text(), 3);
        })

        it("computes obs(a) + obs(b)", function () {
            var binding = "text: a + b",
                context = { a: ko.observable(1), b: ko.observable(2) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.text(), 3);
        })

        it("computes a + b * c", function () {
            var binding = "text: a + b * c",
                context = { a: 1, b: 2, c: 4 },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.text(), 1 + 2 * 4);
        })

        it("compares a + 3 > b * obs(c)", function () {
            var binding = "text: a + 3 > b * c",
                context = { a: 1, b: 2, c: ko.observable(4) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.text(), 1 + 3 > 2 * 4);
        })

        it("respects brackets () precedence", function () {
            var binding = "text: 2 * (3 + 4)",
                bindings = new Parser(null, {}).parse(binding);
            assert.equal(bindings.text(), 2 * (3 + 4))

        })

        it("computes complex arithematic as expected", function () {
            var binding = "text: 1 * 4 % 3 + 11 * 99 / (8 - 14)",
                bindings = new Parser(null, {}).parse(binding);
            assert.equal(bindings.text(), 1 * 4 % 3 + 11 * 99 / (8 - 14));
            // == -180.5
        })

        it("recalculates observables", function () {
            var binding = "text: a - b",
                context = { a: ko.observable(1), b: ko.observable(2) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.text(), -1);
            context.a(2)
            assert.equal(bindings.text(), 0);
        })

        it("sets properties of objects", function () {
            var binding = "text: { x: 3 < 1, y: a < b }",
                context = { a: ko.observable(1), b: ko.observable(2) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.text().x, false);
            assert.equal(bindings.text().y, true);
            context.a(3)
            assert.equal(bindings.text().y, false);
        })

        it("has working logic operations", function () {
            var binding = "text: a || b",
                context = { a: ko.observable(false), b: ko.observable(false) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.text(), false);
            context.a(true)
            assert.equal(bindings.text(), true);
            context.a(false)
            assert.equal(bindings.text(), false);
            context.b(true)
            assert.equal(bindings.text(), true);
        })

        it("does not unwrap a single observable argument", function () {
            var binding = "text: a",
                context = { a: ko.observable() },
                bindings = new Parser(null, context).parse(binding);
            assert.ok(ko.isObservable(bindings.text()))
        })

        it("parses a string of functions a().b()", function () {
            var binding = "ref: a().b()",
                b = function () { return 'Cee' },
                a = function () { return { b: b } },
                context = { a: a },
                bindings = new Parser(null, context).parse(binding);
            assert.ok(bindings.ref(), 'Cee')
        })
    })

    describe("unary operations", function () {
        it("include the negation operator", function () {
            var binding = "neg: !a",
                context = { a: ko.observable(false) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.neg(), true)
            context.a(true);
            assert.equal(bindings.neg(), false)
        });

        it("does the double negative", function () {
            var binding = "neg: !!a",
                context = { a: ko.observable(false) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.neg(), false)
            context.a(true);
            assert.equal(bindings.neg(), true)
        });

        it("works in an object", function () {
            var binding = "neg: { x: !a, y: !!a }",
                context = { a: ko.observable(false) },
                bindings = new Parser(null, context).parse(binding);
            assert.equal(bindings.neg().x, true)
            assert.equal(bindings.neg().y, false)
            context.a(true);
            assert.equal(bindings.neg().x, false)
            assert.equal(bindings.neg().y, true)
        })
    })

    describe("array accessors - []", function () {
        it("works for [ int ]", function () {
            var binding = "ref: a[ 4 ]",
                context = { a: { 4: "square" } },
                bindings = new Parser(null, context).parse(binding)
            assert.equal(bindings.ref(), "square")
        })

        it("works for [ string ]", function () {
            var binding = "neg: a [ 'hello' ]",
                context = { a: { hello: 128} },
                bindings = new Parser(null, context).parse(binding)
            assert.equal(bindings.neg(), 128)
        })

        it("works for [ observable ]", function () {
            var binding = "neg: a[ x ]",
                context = { a: [ 123, 456 ], x: ko.observable(0) },
                bindings = new Parser(null, context).parse(binding)
            assert.equal(bindings.neg(), 123)
            context.x(1)
            assert.equal(bindings.neg(), 456)
        })

        it("works for [ observable ]", function () {
            var binding = "neg: a[ x ]",
                context = { a: [ 123, 456 ], x: ko.observable(1) },
                bindings = new Parser(null, context).parse(binding)
            assert.equal(bindings.neg(), 456)
            context.x(0)
            assert.equal(bindings.neg(), 123)
        })

        it("works off a function e.g. f()[1]") /*, function () {
            var binding = "neg: f()[3]",
                f = function () { return [3, 4, 5, 6]}
                context = { f: f },
                bindings = new Parser(null, context).parse(binding)
            assert.equal(bindings.neg(), 6)
        })*/
    })

    describe("parsing deep objects", function () {
        var context = {
            a: {
                b: {
                    c: {
                        d: 1,
                        e: [9, 8]
                    }
                }
            },
            F1: function () { return 'R1' },
            F2: function () {
                return { G: function () { return 'R2' }}
            }
        };

        function expect_equal(binding, expect) {
            var bindings = new Parser(null, context).parse("v: " + binding)
            assert.equal(bindings.v(), expect)
        }

        function expect_deep_equal(binding, expect) {
            var bindings = new Parser(null, context).parse("v: " + binding)
            assert.deepEqual(bindings.v(), expect)
        }

        it("plucks 'a.b.c'", function () {
            expect_deep_equal('a.b.c', context.a.b.c) // obj
        })

        it("plucks a.b.c.d", function () {
            expect_equal('a.b.c.d', context.a.b.c.d) // 1
        })

        it("plucks a.b.c.x", function () {
            expect_equal('a.b.c.x', context.a.b.c.x) // undefined
        })

        it("plucks a.b.c.d.e[1]", function () {
            expect_equal("a.b.c.e[1]", context.a.b.c.e[1]) // 8
        })

        it("plucks 'x'", function () {
            expect_equal('x', undefined)
        })

        it("throws when 'r' is not on x", function () {
            function fn() {
                expect_equal('x.r', x.r) // undefined
            }
            assert.throws(fn, "x is not defined")
        })

        it("calls function F1", function () {
            expect_equal('F1()', context.F1()) // R1
        })

        it("calls F2().G()", function () {
            expect_equal("F2().G()", context.F2().G()) // R2
        })
    }); // make_accessor

})
