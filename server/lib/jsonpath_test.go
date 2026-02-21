package lib_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"fieldstation/lib"
)

func TestGetAtPath_TopLevel(t *testing.T) {
	obj := lib.JsonObject{"foo": "bar"}
	got, ok := lib.GetAtPath(obj, "foo")
	assert.True(t, ok)
	assert.Equal(t, "bar", got)
}

func TestGetAtPath_DeepNested(t *testing.T) {
	obj := lib.JsonObject{
		"a": lib.JsonObject{
			"b": lib.JsonObject{
				"c": 42,
			},
		},
	}
	got, ok := lib.GetAtPath(obj, "a.b.c")
	assert.True(t, ok)
	assert.Equal(t, 42, got)
}

func TestGetAtPath_MissingKey(t *testing.T) {
	obj := lib.JsonObject{"a": 1}
	_, ok := lib.GetAtPath(obj, "b")
	assert.False(t, ok)
}

func TestGetAtPath_IntermediateNonObject(t *testing.T) {
	obj := lib.JsonObject{"a": "string-not-object"}
	_, ok := lib.GetAtPath(obj, "a.b")
	assert.False(t, ok)
}

func TestGetAtPath_NullValue(t *testing.T) {
	// JSON null (nil in Go) should be distinguishable from a missing key.
	obj := lib.JsonObject{"key": nil}
	got, ok := lib.GetAtPath(obj, "key")
	assert.True(t, ok, "key is present even though value is null")
	assert.Nil(t, got)
}

func TestSetAtPath_TopLevel(t *testing.T) {
	obj := lib.JsonObject{"foo": "old"}
	result := lib.SetAtPath(obj, "foo", "new")
	assert.Equal(t, "new", result["foo"])
	// Original not mutated
	assert.Equal(t, "old", obj["foo"])
}

func TestSetAtPath_CreatesNestedPath(t *testing.T) {
	obj := lib.JsonObject{}
	result := lib.SetAtPath(obj, "a.b.c", true)
	assert.Equal(t, lib.JsonObject{
		"a": lib.JsonObject{
			"b": lib.JsonObject{
				"c": true,
			},
		},
	}, result)
}

func TestSetAtPath_PreservesSiblings(t *testing.T) {
	obj := lib.JsonObject{"a": 1, "b": 2}
	result := lib.SetAtPath(obj, "a", 99)
	assert.Equal(t, 99, result["a"])
	assert.Equal(t, 2, result["b"])
}

func TestSetAtPath_UpdatesExisting(t *testing.T) {
	obj := lib.JsonObject{"a": lib.JsonObject{"b": 1, "c": 2}}
	result := lib.SetAtPath(obj, "a.b", 99)
	inner, ok := result["a"].(lib.JsonObject)
	assert.True(t, ok)
	assert.Equal(t, 99, inner["b"])
	assert.Equal(t, 2, inner["c"])
}

func TestDeleteAtPath_TopLevel(t *testing.T) {
	obj := lib.JsonObject{"a": 1, "b": 2}
	result := lib.DeleteAtPath(obj, "a")
	assert.Equal(t, lib.JsonObject{"b": 2}, result)
	// Original not mutated
	assert.Equal(t, 1, obj["a"])
}

func TestDeleteAtPath_KeepsSiblings(t *testing.T) {
	obj := lib.JsonObject{"a": lib.JsonObject{"b": 1, "c": 2}}
	result := lib.DeleteAtPath(obj, "a.b")
	inner, ok := result["a"].(lib.JsonObject)
	assert.True(t, ok)
	_, hasB := inner["b"]
	assert.False(t, hasB)
	assert.Equal(t, 2, inner["c"])
}

func TestDeleteAtPath_NestedDelete(t *testing.T) {
	obj := lib.JsonObject{"x": lib.JsonObject{"y": lib.JsonObject{"z": "deep"}}}
	result := lib.DeleteAtPath(obj, "x.y.z")
	x, ok := result["x"].(lib.JsonObject)
	assert.True(t, ok)
	y, ok := x["y"].(lib.JsonObject)
	assert.True(t, ok)
	_, hasZ := y["z"]
	assert.False(t, hasZ)
}

func TestDeleteAtPath_MissingKeyReturnsCopy(t *testing.T) {
	obj := lib.JsonObject{"a": 1}
	result := lib.DeleteAtPath(obj, "b")
	assert.Equal(t, lib.JsonObject{"a": 1}, result)
}
