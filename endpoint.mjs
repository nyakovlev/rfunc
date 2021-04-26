function generateId(group, name) {
  let id = name;
  let i = 0;
  while (id in group) {
    id = `${name}_${i}`;
    i++;
  }
  return id;
}

export default function createEndpoint() {
  let localFuncs = {};

  let registerLocal = (name, func) => {
    let id = generateId(localFuncs, name);
    localFuncs[id] = func;
    return id;
  };

  let runLocal = (name, args) => {
    localFuncs[name](...args);
  };

  let decode = (v) => {
    switch (v.type) {
      case "function":
        return (...args) => runRemote(v.name, args);
      case "array":
        return v.items.map(item => decode(item));
      case "object":
        return v.items.reduce((agg, {key, value}) => ({...agg, [key]: value}), {});
      case "value":
        return v.value;
    }
  };

  let encode = (v) => {
    if (v instanceof Function) {
      let name = registerLocal("lam", v);
      return {
        type: "function",
        name
      }
    }
    if (Array.isArray(v)) {
      return {
        type: "array",
        items: v.map(item => encode(item))
      };
    }
    if (v == null) {
      return {
        type: "value",
        value: null
      }
    }
    if (typeof(v) == "object") {
      return {
        type: "object",
        items: Object.keys(v).map(key => ({
          key,
          value: encode(v[key])
        }))
      }
    }
    try {
      return {
        type: "value",
        value: JSON.stringify(v)
      };
    } catch (e) {
      console.warn(`Failed to JSON encode value ${v};`, e);
    }
    return {
      type: "value",
      value: null
    };
  };

  let media = undefined;

  let setMedia = (newMedia) => {
    media = newMedia;
    media.onReceive(({ name, args }) => {
      runLocal(name, decode(args));
    });
  };

  let runRemote = (name, args) => {
    media.send({ name, args: encode(args) });
  };

  let registerRemote = (name) => {
    return (...args) => runRemote(name, args);
  }

  return {
    setMedia,
    registerLocal,
    runRemote,
    registerRemote
  };
}
