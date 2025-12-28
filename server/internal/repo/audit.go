package repo

import (
	"context"

	"stockflows/server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- Audit Logs ---

// CreateAuditLog inserts an audit record (append-only, immutable)
func (r *Repo) CreateAuditLog(ctx context.Context, log models.AuditLog) error {
	log.CreatedAt = now()
	_, err := r.col(ColAuditLogs).InsertOne(ctx, log)
	return err
}

// ListAuditLogsByEntity returns audit history for a specific entity
func (r *Repo) ListAuditLogsByEntity(ctx context.Context, orgID, entityType, entityID string, page, limit int) ([]models.AuditLog, int64, error) {
	filter := bson.M{
		"orgId":      orgID,
		"entityType": entityType,
		"entityId":   entityID,
	}

	total, err := r.col(ColAuditLogs).CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cur, err := r.col(ColAuditLogs).Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.AuditLog
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

// ListAuditLogsByOrg returns all audit logs for an organization
func (r *Repo) ListAuditLogsByOrg(ctx context.Context, orgID string, filter bson.M, page, limit int) ([]models.AuditLog, int64, error) {
	if filter == nil {
		filter = bson.M{}
	}
	filter["orgId"] = orgID

	total, err := r.col(ColAuditLogs).CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cur, err := r.col(ColAuditLogs).Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.AuditLog
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

// ListAuditLogsByUser returns audit logs by a specific user
func (r *Repo) ListAuditLogsByUser(ctx context.Context, orgID, userID string, page, limit int) ([]models.AuditLog, int64, error) {
	filter := bson.M{
		"orgId":  orgID,
		"userId": userID,
	}

	total, err := r.col(ColAuditLogs).CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	skip := (page - 1) * limit
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	cur, err := r.col(ColAuditLogs).Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	var out []models.AuditLog
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}
