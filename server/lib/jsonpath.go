package lib

// JsonObject is an alias for a JSON object (map of string keys to arbitrary values).
//
//nolint:revive // JsonObject is an established API name; renaming to JSONObject would break many call sites
type JsonObject = map[string]any

// GetAtPath traverses obj following the dot-separated path and returns the value
// at that location. Returns (nil, false) if any segment is missing or an intermediate
// value is not a JsonObject. Returns (nil, true) when the key is present with a JSON
// null value, distinguishing it from the "key not found" case.
func GetAtPath(obj JsonObject, path string) (any, bool) {
	keys := splitPath(path)
	var current any = obj
	for _, key := range keys {
		m, ok := current.(JsonObject)
		if !ok {
			return nil, false
		}
		val, exists := m[key]
		if !exists {
			return nil, false
		}
		current = val
	}
	return current, true
}

// SetAtPath returns a new JsonObject with value placed at the dot-separated path.
// Intermediate objects are created as needed. The original obj is not mutated.
func SetAtPath(obj JsonObject, path string, value any) JsonObject {
	keys := splitPath(path)
	return setRecursive(obj, keys, value)
}

func setRecursive(obj JsonObject, keys []string, value any) JsonObject {
	result := shallowCopy(obj)
	if len(keys) == 1 {
		result[keys[0]] = value
		return result
	}
	// More than one key: descend into child
	first := keys[0]
	rest := keys[1:]
	child, ok := result[first].(JsonObject)
	if !ok {
		child = JsonObject{}
	}
	result[first] = setRecursive(child, rest, value)
	return result
}

// DeleteAtPath returns a new JsonObject with the key at the dot-separated path
// removed. The original obj is not mutated.
func DeleteAtPath(obj JsonObject, path string) JsonObject {
	keys := splitPath(path)
	return deleteRecursive(obj, keys)
}

func deleteRecursive(obj JsonObject, keys []string) JsonObject {
	result := shallowCopy(obj)
	if len(keys) == 1 {
		delete(result, keys[0])
		return result
	}
	first := keys[0]
	rest := keys[1:]
	child, ok := result[first].(JsonObject)
	if !ok {
		// Intermediate is not an object — nothing to delete, return copy
		return result
	}
	result[first] = deleteRecursive(child, rest)
	return result
}

// splitPath splits a dot-separated path into its component keys.
func splitPath(path string) []string {
	// Manual split to avoid importing strings and to handle edge cases cleanly.
	// We need ALL segments (not just first two), so we iterate.
	var keys []string
	start := 0
	for i := 0; i <= len(path); i++ {
		if i == len(path) || path[i] == '.' {
			keys = append(keys, path[start:i])
			start = i + 1
		}
	}
	return keys
}

// shallowCopy returns a shallow copy of a JsonObject.
func shallowCopy(obj JsonObject) JsonObject {
	result := make(JsonObject, len(obj))
	for k, v := range obj {
		result[k] = v
	}
	return result
}
