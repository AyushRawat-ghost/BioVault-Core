package auth

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, handler *AuthHandler) {
	authGroup := rg.Group("/auth")
	{
		authGroup.GET("/nonce", handler.GetNonce)
		authGroup.POST("/login", handler.Login)
	}
}
