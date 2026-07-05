package records

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.RouterGroup, handler *RecordsHandler) {
	recordsGroup := router.Group("/records")
	{
		recordsGroup.POST("/upload", handler.UploadRecord)
		recordsGroup.GET("/list", handler.GetRecordsList)
	}

	// Add special avatar upload endpoint under /patient/avatar
	router.POST("/patient/avatar", handler.UploadAvatar)
}
