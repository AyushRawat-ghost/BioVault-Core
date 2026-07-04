package patient

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, handler *PatientHandler) {
	patientGroup := rg.Group("/patient")
	{
		patientGroup.GET("/profile", handler.GetProfile)
	}
}
