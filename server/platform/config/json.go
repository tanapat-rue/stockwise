package config

import (
	"encoding/json"
	"fmt"
	"os"
)

// Validator can be implemented by config structs to self-validate after load.
type Validator interface {
	Validate() error
}

// LoadJSONFile loads a JSON file into a typed config struct.
func LoadJSONFile[T any](path string) (T, error) {
	var cfg T

	data, err := os.ReadFile(path)
	if err != nil {
		return cfg, fmt.Errorf("read config %q: %w", path, err)
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return cfg, fmt.Errorf("parse config %q: %w", path, err)
	}

	// Support both value-receiver and pointer-receiver validation.
	if v, ok := any(cfg).(Validator); ok {
		if err := v.Validate(); err != nil {
			return cfg, err
		}
	} else if v, ok := any(&cfg).(Validator); ok {
		if err := v.Validate(); err != nil {
			return cfg, err
		}
	}

	return cfg, nil
}

// LoadJSONFileFromEnv loads config from a path specified in envVar, falling
// back to defaultPath when envVar is empty.
func LoadJSONFileFromEnv[T any](envVar, defaultPath string) (T, error) {
	path := os.Getenv(envVar)
	if path == "" {
		path = defaultPath
	}
	return LoadJSONFile[T](path)
}

// MustLoadJSONFile panics if the config cannot be loaded.
func MustLoadJSONFile[T any](path string) T {
	cfg, err := LoadJSONFile[T](path)
	if err != nil {
		panic(err)
	}
	return cfg
}

// MustLoadJSONFileFromEnv panics if the config cannot be loaded from envVar or defaultPath.
func MustLoadJSONFileFromEnv[T any](envVar, defaultPath string) T {
	cfg, err := LoadJSONFileFromEnv[T](envVar, defaultPath)
	if err != nil {
		panic(err)
	}
	return cfg
}
