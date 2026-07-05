package patient

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, handler *PatientHandler) {
	patientGroup := rg.Group("/patient")
	{
		patientGroup.GET("/profile", handler.GetProfile)
		patientGroup.POST("/appointments", handler.BookAppointment)
		patientGroup.GET("/appointments", handler.GetAppointments)
		patientGroup.GET("/implants", handler.GetImplants)
		patientGroup.GET("/prescriptions", handler.GetPrescriptions)
		patientGroup.GET("/insurance", handler.GetInsurance)
		patientGroup.POST("/insurance/claim", handler.SubmitInsuranceClaim)
		patientGroup.POST("/insurance/claim/update", handler.UpdateInsuranceClaim)
	}
}
