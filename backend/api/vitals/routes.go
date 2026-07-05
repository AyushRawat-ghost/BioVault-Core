package vitals

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.RouterGroup, handler *VitalsHandler) {
	vitalsGroup := router.Group("/vitals")
	{
		vitalsGroup.POST("/stream", handler.StreamVitals)
		vitalsGroup.GET("/history", handler.GetVitalsHistory)
	}
}
