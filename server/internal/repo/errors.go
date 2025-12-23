package repo

import "errors"

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
	ErrInsufficientStock = errors.New("insufficient stock")
	ErrInsufficientLots = errors.New("insufficient lots")
)
