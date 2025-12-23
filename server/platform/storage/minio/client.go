package minio

import (
	"context"
	"io"
	"net/url"
	"time"

	minioSDK "github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Config struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	UseSSL    bool
}

type Client struct {
	client *minioSDK.Client
}

func New(cfg Config) (*Client, error) {
	c, err := minioSDK.New(cfg.Endpoint, &minioSDK.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, err
	}
	return &Client{client: c}, nil
}

func (c *Client) EnsureBucket(ctx context.Context, bucketName string, region string) error {
	if c == nil || c.client == nil {
		return nil
	}
	if region == "" {
		region = "local"
	}
	err := c.client.MakeBucket(ctx, bucketName, minioSDK.MakeBucketOptions{Region: region})
	if err == nil {
		return nil
	}
	exists, existsErr := c.client.BucketExists(ctx, bucketName)
	if existsErr == nil && exists {
		return nil
	}
	return err
}

func (c *Client) PutFile(ctx context.Context, bucketName, objectName, filePath, contentType string) (*minioSDK.UploadInfo, error) {
	if c == nil || c.client == nil {
		return nil, nil
	}
	info, err := c.client.FPutObject(ctx, bucketName, objectName, filePath, minioSDK.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return nil, err
	}
	return &info, nil
}

func (c *Client) PutObject(ctx context.Context, bucketName, objectName string, r io.Reader, size int64, contentType string) (*minioSDK.UploadInfo, error) {
	if c == nil || c.client == nil {
		return nil, nil
	}
	info, err := c.client.PutObject(ctx, bucketName, objectName, r, size, minioSDK.PutObjectOptions{ContentType: contentType})
	if err != nil {
		return nil, err
	}
	return &info, nil
}

func (c *Client) RemoveObject(ctx context.Context, bucketName, objectName string) error {
	if c == nil || c.client == nil {
		return nil
	}
	return c.client.RemoveObject(ctx, bucketName, objectName, minioSDK.RemoveObjectOptions{GovernanceBypass: true})
}

func (c *Client) StatObject(ctx context.Context, bucketName, objectName string) (minioSDK.ObjectInfo, error) {
	if c == nil || c.client == nil {
		return minioSDK.ObjectInfo{}, nil
	}
	return c.client.StatObject(ctx, bucketName, objectName, minioSDK.StatObjectOptions{})
}

func (c *Client) GetObject(ctx context.Context, bucketName, objectName string) (*minioSDK.Object, error) {
	if c == nil || c.client == nil {
		return nil, nil
	}
	return c.client.GetObject(ctx, bucketName, objectName, minioSDK.GetObjectOptions{})
}

func (c *Client) PresignPutObject(ctx context.Context, bucketName, objectName string, expiry time.Duration) (*url.URL, error) {
	if c == nil || c.client == nil {
		return nil, nil
	}
	if expiry <= 0 {
		expiry = 2 * time.Hour
	}
	return c.client.PresignedPutObject(ctx, bucketName, objectName, expiry)
}

func (c *Client) PresignGetObject(ctx context.Context, bucketName, objectName string, expiry time.Duration, downloadFilename string) (*url.URL, error) {
	if c == nil || c.client == nil {
		return nil, nil
	}
	if expiry <= 0 {
		expiry = 2 * time.Hour
	}
	reqParams := make(url.Values)
	if downloadFilename != "" {
		reqParams.Set("response-content-disposition", "attachment; filename=\""+downloadFilename+"\"")
	}
	return c.client.PresignedGetObject(ctx, bucketName, objectName, expiry, reqParams)
}

func (c *Client) CopyObject(ctx context.Context, bucketName, objectName, newObjectName string) (*minioSDK.UploadInfo, error) {
	if c == nil || c.client == nil {
		return nil, nil
	}
	src := minioSDK.CopySrcOptions{
		Bucket: bucketName,
		Object: objectName,
	}
	dst := minioSDK.CopyDestOptions{
		Bucket: bucketName,
		Object: newObjectName,
	}
	info, err := c.client.CopyObject(ctx, dst, src)
	if err != nil {
		return nil, err
	}
	return &info, nil
}
