package mongodb

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (c *Client) Collection(name string) *mongo.Collection {
	if c == nil || c.DB == nil {
		return nil
	}
	return c.DB.Collection(name)
}

func (c *Client) InsertOne(ctx context.Context, collection string, doc any) (*mongo.InsertOneResult, error) {
	return c.DB.Collection(collection).InsertOne(ctx, doc)
}

func (c *Client) InsertMany(ctx context.Context, collection string, docs []any, opts ...*options.InsertManyOptions) (*mongo.InsertManyResult, error) {
	return c.DB.Collection(collection).InsertMany(ctx, docs, opts...)
}

func (c *Client) ReplaceOne(ctx context.Context, collection string, filter any, replacement any, opts ...*options.ReplaceOptions) (*mongo.UpdateResult, error) {
	return c.DB.Collection(collection).ReplaceOne(ctx, filter, replacement, opts...)
}

func (c *Client) UpdateOne(ctx context.Context, collection string, filter any, update any, opts ...*options.UpdateOptions) (*mongo.UpdateResult, error) {
	return c.DB.Collection(collection).UpdateOne(ctx, filter, update, opts...)
}

func (c *Client) UpdateMany(ctx context.Context, collection string, filter any, update any, opts ...*options.UpdateOptions) (*mongo.UpdateResult, error) {
	return c.DB.Collection(collection).UpdateMany(ctx, filter, update, opts...)
}

func (c *Client) DeleteOne(ctx context.Context, collection string, filter any, opts ...*options.DeleteOptions) (*mongo.DeleteResult, error) {
	return c.DB.Collection(collection).DeleteOne(ctx, filter, opts...)
}

func (c *Client) DeleteMany(ctx context.Context, collection string, filter any, opts ...*options.DeleteOptions) (*mongo.DeleteResult, error) {
	return c.DB.Collection(collection).DeleteMany(ctx, filter, opts...)
}

func (c *Client) FindOne(ctx context.Context, collection string, filter any, opts ...*options.FindOneOptions) *mongo.SingleResult {
	return c.DB.Collection(collection).FindOne(ctx, filter, opts...)
}

func (c *Client) Find(ctx context.Context, collection string, filter any, opts ...*options.FindOptions) (*mongo.Cursor, error) {
	return c.DB.Collection(collection).Find(ctx, filter, opts...)
}

func (c *Client) Count(ctx context.Context, collection string, filter any, opts ...*options.CountOptions) (int64, error) {
	return c.DB.Collection(collection).CountDocuments(ctx, filter, opts...)
}

func (c *Client) Aggregate(ctx context.Context, collection string, pipeline any, opts ...*options.AggregateOptions) (*mongo.Cursor, error) {
	return c.DB.Collection(collection).Aggregate(ctx, pipeline, opts...)
}

// ToBsonM converts a struct/map into a bson.M via marshal/unmarshal.
func ToBsonM(v any) (bson.M, error) {
	data, err := bson.Marshal(v)
	if err != nil {
		return bson.M{}, err
	}
	out := bson.M{}
	if err := bson.Unmarshal(data, &out); err != nil {
		return bson.M{}, err
	}
	return out, nil
}
