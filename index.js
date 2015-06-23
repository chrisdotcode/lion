;(function(exports) {
	"use strict";

	var url = require("url");

	function Router(options) {
		this._options = {};

		this._routes = {
			get: {
				absolute: {},
				regex: {},
				relative: {},
			},
			post: {
				absolute: {},
				regex: {},
				relative: {},
			},
			put: {
				absolute: {},
				regex: {},
				relative: {},
			},
			delete: {
				absolute: {},
				regex: {},
				relative: {},
			},
			options: {
				absolute: {},
				regex: {},
				relative: {},
			},
			connect: {
				absolute: {},
				regex: {},
				relative: {},
			},
			trace: {
				absolute: {},
				regex: {},
				relative: {},
			},
			// HTTP HEAD omitted.
				// One possible HEAD implementation would be to
				// monkey patch anything that would end the
				// request (request.end, "end" event, etc.)
				// with NOPs, run the corresponding get handler
				// for the route, strip the message body, and
				// then return only the headers.
		};

		this._subRouters = {};
	}

	Router.prototype._addRoute = function addRoute(method, route, fn) {
		if (route instanceof RegExp) {
			this._routes[method].regex[route.source] = fn;

			return this;
		// If the route has no ":variable" path segments.
		} else if (route.indexOf(':') == -1) {
			this._routes[method].absolute[route] = fn;

			return this;
		}

		// We start at the root of the route tree, and walk it for each
		// path segment.
		var pathTree = this._routes[method].relative;

		route.split('/').forEach(function(pathSegment) {
			// Skip empty path segments; if there was a prefixing
			// forward-slash in the route, this is also skipped.
			if (pathSegment.length === 0) {
				return;
			}

			// If the path segment contains a ':', it is a
			// ":variable" path segment.
			if (pathSegment.indexOf(':') !== -1) {
				pathSegment = ":variable";
			}

			if (!pathTree[pathSegment]) {
				// Since we're creating a tree, some of the
				// paths we're walking might exist already. If
				// they don't yet, initialize a new 'leaf'.
				pathTree[pathSegment] = {};
			}

			// Walk one branch forward.
			pathTree = pathTree[pathSegment];
		});

		// Attach the function to this current leaf of the route tree.
		pathTree.fn = fn;

		return this;
	};

	Router.prototype._addSubRouter = function addSubRouter(route, router) {
		this._subRouters[route] = router;

		return this;
	};

	Router.prototype.connect = function connect(route, handler) {
		this._addRoute("connect", route, handler);

		return this;
	};

	Router.prototype.delete = function put(route, handler) {
		this._addRoute("delete", route, handler);

		return this;
	};

	Router.prototype.get = function get(route, handler) {
		this._addRoute("get", route, handler);

		return this;
	};

	Router.prototype.options = function put(route, handler) {
		this._addRoute("options", route, handler);

		return this;
	};

	Router.prototype.post = function post(route, handler) {
		this._addRoute("post", route, handler);

		return this;
	};

	Router.prototype.put = function put(route, handler) {
		this._addRoute("put", route, handler);

		return this;
	};

	Router.prototype.trace = function trace(route, handler) {
		this._addRoute("trace", route, handler);

		return this;
	};

	Router.prototype.addMethod = function addMethod(method) {
		this._routes[method] = {
			absolute: {},
			regex: {},
			relative: {},
		};

		this[method] = function method(route, handler) {
			this._addRoute(method, route, handler);

			return this;
		};

		return this;
	};

	Router.prototype.handle404 = function handle404(_, response) {
		var notFound = "Not Found.";
		response.writeHead(404, {
			"Content-Length": notFound.length,
			"Content-Type": "text/plain",
		});
		response.end(notFound);

		return this;
	};

	Router.prototype.handle400 = function handle400(_, response) {
		var badRequest = "Bad Request.";
		response.writeHead(400, {
			"Content-Length": badRequest.length,
			"Content-Type": "text/plain",
		});
		response.end(badRequest);

		return this;
	};

	Router.prototype.dispatch = function dispatch(request, response) {
		var requestUrl = url.parse(request.url, true);
		var method     = request.method.toLowerCase();

		if (!method in this._routes) {
			this.handle400(request, response);

			return this;
		}

		var absoluteMatch = this._routes[method]
					.absolute[requestUrl.pathname];

		if (absoluteMatch) {
			absoluteMatch(request, response, requestUrl.query);

			return this;
		}

		var regexMatch = null;
		// Regexes matches are searched for in order of insertion: that
		// is, a regex route inserted first will be searched before a
		// regex route that was inserted second. Upon first regex route
		// match, searching stops.
		for (var regexp in this._routes[method].regex) {
			regexMatch = new RegExp(regexp)
				.exec(requestUrl.pathname);

			if (regexMatch) {
				var args = [request, response].concat(regexMatch.slice(1), requestUrl.query);
				this._routes[method].regex[regexp]
					.apply({}, args);

				return this;
			}
		}

		var requestUrlTree = requestUrl.pathname.split('/');
		var pathTree       = this._routes[method].relative;
		var pathSegment    = null;
		var argList        = [];
		var relativeMatch  = true;

		// Walk the pathTree, using the path segments from the
		// requestUrlTree. If every segment down to the leaf of the
		// requestUrlTree matches every segment at the same level in
		// the pathTree, there's a route match.
		for (var i = 0, len = requestUrlTree.length; i < len; i++) {
			pathSegment = requestUrlTree[i];

			// Skips any duplicate '/'s that were in the url.
			if (pathSegment.length === 0) {
				continue;
			}

			// If there is a ":variable" in the current level of
			// the pathTree, capture the corresponding path
			// segment, add it to the argList, and drill deeper.
			if (pathTree[":variable"]) {
				argList.push(pathSegment);
				pathTree = pathTree[":variable"]; // HEEERRROOOOO
			// If the current level of the pathTree and the path
			// segment match, drill deeper.
			} else if (pathTree[pathSegment]) {
				pathTree = pathTree[pathSegment];
			} else {
				// *All* pathSegments of a url must match.
				relativeMatch = false;
				break;
			}
		}

		if (relativeMatch) {
			var args = [request, response].concat(argList, requestUrl.query);
			pathTree.fn.apply({}, args);
		} else {
			this.handle404(request, response);
		}
		return this;
	}

	function router(options) {
		return new Router(options);
	}

	exports.router = router;

})(typeof module.exports === "undefined" ? this["lion"] = {} : module.exports);
