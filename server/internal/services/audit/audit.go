package audit

import (
	"context"
	"reflect"

	"stockflows/server/internal/models"
	"stockflows/server/internal/repo"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Service provides audit logging functionality
type Service struct {
	repo *repo.Repo
}

// New creates a new audit service
func New(r *repo.Repo) *Service {
	return &Service{repo: r}
}

// RecordCreate logs entity creation
func (s *Service) RecordCreate(ctx context.Context, user models.User, entityType, entityID string, newValue interface{}) error {
	newBytes, err := bson.Marshal(newValue)
	if err != nil {
		return err
	}

	log := models.AuditLog{
		ID:         primitive.NewObjectID().Hex(),
		OrgID:      user.OrgID,
		EntityType: entityType,
		EntityID:   entityID,
		Action:     models.AuditActionCreate,
		UserID:     user.ID,
		UserName:   user.Name,
		UserEmail:  user.Email,
		NewValue:   newBytes,
	}

	return s.repo.CreateAuditLog(ctx, log)
}

// RecordUpdate logs entity update with before/after comparison
func (s *Service) RecordUpdate(ctx context.Context, user models.User, entityType, entityID string, oldValue, newValue interface{}) error {
	oldBytes, err := bson.Marshal(oldValue)
	if err != nil {
		return err
	}

	newBytes, err := bson.Marshal(newValue)
	if err != nil {
		return err
	}

	changedFields := ComputeChangedFields(oldValue, newValue)

	log := models.AuditLog{
		ID:            primitive.NewObjectID().Hex(),
		OrgID:         user.OrgID,
		EntityType:    entityType,
		EntityID:      entityID,
		Action:        models.AuditActionUpdate,
		UserID:        user.ID,
		UserName:      user.Name,
		UserEmail:     user.Email,
		OldValue:      oldBytes,
		NewValue:      newBytes,
		ChangedFields: changedFields,
	}

	return s.repo.CreateAuditLog(ctx, log)
}

// RecordDelete logs entity deletion
func (s *Service) RecordDelete(ctx context.Context, user models.User, entityType, entityID string, oldValue interface{}) error {
	oldBytes, err := bson.Marshal(oldValue)
	if err != nil {
		return err
	}

	log := models.AuditLog{
		ID:         primitive.NewObjectID().Hex(),
		OrgID:      user.OrgID,
		EntityType: entityType,
		EntityID:   entityID,
		Action:     models.AuditActionDelete,
		UserID:     user.ID,
		UserName:   user.Name,
		UserEmail:  user.Email,
		OldValue:   oldBytes,
	}

	return s.repo.CreateAuditLog(ctx, log)
}

// RecordWithContext logs an action with additional context
func (s *Service) RecordWithContext(ctx context.Context, user models.User, entityType, entityID string, action models.AuditAction, oldValue, newValue interface{}, ipAddress, userAgent, reason string) error {
	var oldBytes, newBytes bson.Raw
	var err error

	if oldValue != nil {
		oldBytes, err = bson.Marshal(oldValue)
		if err != nil {
			return err
		}
	}

	if newValue != nil {
		newBytes, err = bson.Marshal(newValue)
		if err != nil {
			return err
		}
	}

	var changedFields []string
	if oldValue != nil && newValue != nil {
		changedFields = ComputeChangedFields(oldValue, newValue)
	}

	log := models.AuditLog{
		ID:            primitive.NewObjectID().Hex(),
		OrgID:         user.OrgID,
		EntityType:    entityType,
		EntityID:      entityID,
		Action:        action,
		UserID:        user.ID,
		UserName:      user.Name,
		UserEmail:     user.Email,
		OldValue:      oldBytes,
		NewValue:      newBytes,
		ChangedFields: changedFields,
		IPAddress:     ipAddress,
		UserAgent:     userAgent,
		Reason:        reason,
	}

	return s.repo.CreateAuditLog(ctx, log)
}

// ComputeChangedFields extracts field names that differ between old and new values
func ComputeChangedFields(old, new interface{}) []string {
	changed := make([]string, 0)

	oldVal := reflect.ValueOf(old)
	newVal := reflect.ValueOf(new)

	// Handle pointers
	if oldVal.Kind() == reflect.Ptr {
		oldVal = oldVal.Elem()
	}
	if newVal.Kind() == reflect.Ptr {
		newVal = newVal.Elem()
	}

	// Only compare structs
	if oldVal.Kind() != reflect.Struct || newVal.Kind() != reflect.Struct {
		return changed
	}

	oldType := oldVal.Type()
	for i := 0; i < oldVal.NumField(); i++ {
		field := oldType.Field(i)

		// Skip unexported fields
		if !field.IsExported() {
			continue
		}

		// Get the BSON/JSON field name
		fieldName := field.Name
		if tag := field.Tag.Get("bson"); tag != "" && tag != "-" {
			parts := splitTag(tag)
			if parts[0] != "" {
				fieldName = parts[0]
			}
		} else if tag := field.Tag.Get("json"); tag != "" && tag != "-" {
			parts := splitTag(tag)
			if parts[0] != "" {
				fieldName = parts[0]
			}
		}

		// Skip timestamp fields
		if fieldName == "createdAt" || fieldName == "updatedAt" || fieldName == "version" {
			continue
		}

		oldField := oldVal.Field(i)
		newField := newVal.FieldByName(field.Name)

		if !newField.IsValid() {
			continue
		}

		// Compare values
		if !reflect.DeepEqual(oldField.Interface(), newField.Interface()) {
			changed = append(changed, fieldName)
		}
	}

	return changed
}

func splitTag(tag string) []string {
	result := make([]string, 0, 2)
	for i, c := range tag {
		if c == ',' {
			result = append(result, tag[:i])
			result = append(result, tag[i+1:])
			return result
		}
	}
	return []string{tag}
}
