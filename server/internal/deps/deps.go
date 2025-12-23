package deps

import (
	"stockflows/server/internal/appconfig"
	"stockflows/server/internal/repo"
	"stockflows/server/platform/db/mongodb"
	"stockflows/server/platform/session"
	"stockflows/server/platform/storage/minio"
)

type Dependencies struct {
	Mongo  *mongodb.Client
	MinIO  *minio.Client
	Sess   session.Store
	Repo   *repo.Repo
	Config appconfig.Config
}
