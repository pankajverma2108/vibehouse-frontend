/* eslint-disable @typescript-eslint/no-unused-vars */

var SHELL = "__static_shell__";

function redirect(location, permanent) {
  return {
    statusCode: permanent ? 308 : 307,
    statusDescription: permanent ? "Permanent Redirect" : "Temporary Redirect",
    headers: {
      location: { value: location },
      "cache-control": { value: "no-store" },
    },
  };
}

function notFound() {
  return {
    statusCode: 404,
    statusDescription: "Not Found",
    headers: {
      "cache-control": { value: "no-store" },
    },
  };
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var match;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return request;
  }

  if (uri.indexOf("/" + SHELL) !== -1) {
    return notFound();
  }

  if (uri === "/launching-soon") {
    return redirect("/upcoming", false);
  }
  if (uri === "/reviewnew") {
    return redirect("/bookingreview", false);
  }

  match = uri.match(/^\/bookings\/([^/]+)\/pre-arrival$/);
  if (match) {
    return redirect("/bookings/" + match[1] + "/web-check-in", false);
  }

  match = uri.match(/^\/([^/]+)\/guest\/(borrow|extend|lost-found)$/);
  if (match) {
    if (match[2] === "borrow") {
      return redirect("/" + match[1] + "/guest/addons#rentals", false);
    }
    if (match[2] === "extend") {
      return redirect("/" + match[1] + "/guest/addons#upgrades", false);
    }
    return redirect("/" + match[1] + "/guest#lost-found", false);
  }

  var policyAnchors = {
    guest: "general-policy",
    privacy: "privacy-policy",
    refund: "cancellation-refund-policy",
    terms: "terms-liability-governing-law",
  };
  match = uri.match(/^\/policies\/(guest|privacy|refund|terms)$/);
  if (match) {
    return redirect("/policies#" + policyAnchors[match[1]], true);
  }

  if (uri.length > 1 && uri.charAt(uri.length - 1) === "/") {
    return redirect(uri.slice(0, -1), true);
  }

  // Next's exported client prefetches flattened RSC paths, while S3 stores the
  // route segments as directories below the first __next.<segment> name.
  match = uri.match(/^(.*\/)(__next\.)(.+)\.__PAGE__\.txt$/);
  if (match) {
    request.uri = match[1] + match[2] + match[3].split(".").join("/") + "/__PAGE__.txt";
    return request;
  }

  match = uri.match(/^\/bookings\/[^/]+\/(confirmed|web-check-in)$/);
  if (match) {
    request.uri = "/bookings/" + SHELL + "/" + match[1] + ".html";
    return request;
  }

  match = uri.match(/^\/(breakfast|feedback)\/([^/]+)$/);
  if (match && match[2] !== "preview") {
    request.uri = "/" + match[1] + "/" + SHELL + ".html";
    return request;
  }

  match = uri.match(/^\/[^/]+\/guest(?:\/(addons|borrow|checkout|extend|guide|lost-found|review|services))?$/);
  if (match) {
    request.uri = "/" + SHELL + "/guest" + (match[1] ? "/" + match[1] : "") + ".html";
    return request;
  }

  if (uri === "/") {
    request.uri = "/index.html";
    return request;
  }

  if (
    uri === "/api/health" ||
    uri.indexOf("/_next/") === 0 ||
    uri.indexOf("/.well-known/") === 0 ||
    /\.[^/]+$/.test(uri)
  ) {
    return request;
  }

  request.uri = uri + ".html";
  return request;
}
