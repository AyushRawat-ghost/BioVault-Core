package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	bucket := os.Getenv("AWS_S3_BUCKET")
	if bucket == "" {
		bucket = os.Getenv("AWS_S3_BIO_BUCKET")
	}
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = os.Getenv("AWS_DEFAULT_REGION")
	}

	fmt.Printf("Configured S3 Bucket: %s\n", bucket)
	fmt.Printf("Configured AWS Region: %s\n", region)

	if bucket == "" {
		log.Fatal("S3 bucket name is not configured in .env")
	}

	// Force region to us-east-1 initially to query the location of the bucket
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("us-east-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config: %v", err)
	}

	client := s3.NewFromConfig(cfg)

	loc, err := client.GetBucketLocation(context.TODO(), &s3.GetBucketLocationInput{
		Bucket: &bucket,
	})
	if err != nil {
		log.Fatalf("failed to get bucket location: %v", err)
	}

	bucketRegion := string(loc.LocationConstraint)
	if bucketRegion == "" {
		bucketRegion = "us-east-1" // S3 default region is us-east-1 if location constraint is empty
	}

	fmt.Printf("SUCCESS! The actual S3 Bucket Region is: %s\n", bucketRegion)
}
