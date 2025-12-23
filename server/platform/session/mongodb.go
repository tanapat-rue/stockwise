package session

import (
	"context"
	"encoding/json"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoStore struct {
	ttl time.Duration
	col *mongo.Collection
}

type sessionDocument struct {
	ID        string    `bson:"_id"`
	Data      []byte    `bson:"data"`
	ExpiresAt time.Time `bson:"expiresAt"`
}

func NewMongoStore(db *mongo.Database, collectionName string, ttl time.Duration) *MongoStore {
	if ttl <= 0 {
		ttl = 7 * 24 * time.Hour
	}
	return &MongoStore{
		ttl: ttl,
		col: db.Collection(collectionName),
	}
}

// EnsureIndexes creates a TTL index on expiresAt (best-effort).
func (s *MongoStore) EnsureIndexes(ctx context.Context) error {
	if s == nil || s.col == nil {
		return nil
	}
	_, err := s.col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "expiresAt", Value: 1}},
		Options: options.Index().
			SetName("session_expiresAt_ttl").
			SetExpireAfterSeconds(0),
	})
	return err
}

func (s *MongoStore) Set(ctx context.Context, sessionID string, data any) error {
	if s == nil || s.col == nil {
		return nil
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	doc := sessionDocument{
		ID:        sessionID,
		Data:      jsonData,
		ExpiresAt: time.Now().Add(s.ttl),
	}

	_, err = s.col.UpdateOne(
		ctx,
		bson.M{"_id": sessionID},
		bson.M{"$set": doc},
		options.Update().SetUpsert(true),
	)
	return err
}

func (s *MongoStore) Get(ctx context.Context, sessionID string) (any, bool, error) {
	if s == nil || s.col == nil {
		return nil, false, nil
	}

	var doc sessionDocument
	err := s.col.FindOne(ctx, bson.M{
		"_id":       sessionID,
		"expiresAt": bson.M{"$gt": time.Now()},
	}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	var out any
	if err := json.Unmarshal(doc.Data, &out); err != nil {
		return nil, false, err
	}
	return out, true, nil
}

func (s *MongoStore) Del(ctx context.Context, sessionID string) error {
	if s == nil || s.col == nil {
		return nil
	}
	_, err := s.col.DeleteOne(ctx, bson.M{"_id": sessionID})
	return err
}

func (s *MongoStore) Exists(ctx context.Context, sessionID string) (bool, error) {
	if s == nil || s.col == nil {
		return false, nil
	}
	count, err := s.col.CountDocuments(ctx, bson.M{
		"_id":       sessionID,
		"expiresAt": bson.M{"$gt": time.Now()},
	})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
