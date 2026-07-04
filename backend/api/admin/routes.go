package admin

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, handler *AdminHandler) {
	adminGroup := rg.Group("/admin")
	{
		adminGroup.POST("/patient/admit", handler.AdmitPatient)
	}
}
