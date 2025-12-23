package datatables

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DecodeFunc func(*mongo.Cursor) (any, error)

// SelectDataTableWithFilter queries a collection with DataTables paging/sort,
// applying a main filter AND search filter, returning:
// - results
// - count with filter
// - count without filter (main filter only)
func SelectDataTableWithFilter(
	ctx context.Context,
	collection *mongo.Collection,
	mainFilter bson.M,
	searchFilter bson.M,
	param DataTablesParam,
	decode DecodeFunc,
) ([]any, int64, int64, error) {
	if mainFilter == nil {
		mainFilter = bson.M{}
	}
	if searchFilter == nil {
		searchFilter = bson.M{}
	}

	filter := bson.M{"$and": []bson.M{mainFilter, searchFilter}}
	findOptions := options.Find()

	if len(param.Order) > 0 && len(param.Columns) > 0 {
		sort := bson.D{}
		for _, o := range param.Order {
			if o.Column < 0 || o.Column >= len(param.Columns) {
				continue
			}
			sortOrder := int32(-1)
			if o.Dir == "asc" {
				sortOrder = 1
			}
			sort = append(sort, bson.E{Key: param.Columns[o.Column].Data, Value: sortOrder})
		}
		if len(sort) > 0 {
			findOptions.SetSort(sort)
		}
	}

	if param.Length > 0 {
		findOptions.SetLimit(int64(param.Length))
	}
	if param.Start > 0 {
		findOptions.SetSkip(int64(param.Start))
	}

	cur, err := collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, 0, 0, err
	}

	results := []any{}
	for cur.Next(ctx) {
		elem, err := decode(cur)
		if err != nil {
			_ = cur.Close(ctx)
			return nil, 0, 0, err
		}
		results = append(results, elem)
	}
	_ = cur.Close(ctx)

	countWithFilter, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, 0, err
	}
	countWOFilter, err := collection.CountDocuments(ctx, mainFilter)
	if err != nil {
		return nil, 0, 0, err
	}

	return results, countWithFilter, countWOFilter, nil
}
