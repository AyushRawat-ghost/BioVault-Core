package admin

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, handler *AdminHandler) {
	adminGroup := rg.Group("/admin")
	{
		adminGroup.POST("/patient/admit", handler.AdmitPatient)
		adminGroup.GET("/patients", handler.ListAdmittedPatients)
		adminGroup.POST("/doctor/admit", handler.AdmitDoctor)
		adminGroup.GET("/doctors", handler.ListDoctors)
		adminGroup.GET("/kpis", handler.GetHospitalKPIs)
		adminGroup.GET("/logs", handler.GetHospitalLogs)
		adminGroup.GET("/patient/details", handler.GetPatientDetails)
		adminGroup.GET("/doctor/details", handler.GetDoctorDetails)
		adminGroup.GET("/doctor/activity", handler.GetDoctorActivity)
		adminGroup.GET("/doctor/patients", handler.GetDoctorPatients)
		adminGroup.GET("/anomaly-logs", handler.GetAnomalyLogs)
		adminGroup.POST("/doctor/override-access", handler.OverrideAccess)
		adminGroup.GET("/doctor/override-list", handler.ListOverrides)
		adminGroup.POST("/doctor/override-vote", handler.VoteOverride)
		adminGroup.POST("/doctor/transfer-care", handler.TransferCare)
		adminGroup.POST("/patient/update", handler.UpdatePatientDetails)
		adminGroup.POST("/doctor/update", handler.UpdateDoctorDetails)
		adminGroup.POST("/regulatory/devices/register", handler.RegisterImplantableDevice)
		adminGroup.POST("/regulatory/devices/implant", handler.ImplantDevice)
		adminGroup.POST("/regulatory/devices/recall", handler.RecallDevice)
		adminGroup.GET("/regulatory/devices", handler.ListDevices)
		adminGroup.POST("/regulatory/narcotics/request", handler.RequestNarcotic)
		adminGroup.POST("/regulatory/narcotics/authorize", handler.AuthorizeNarcotic)
		adminGroup.GET("/regulatory/narcotics", handler.ListNarcotics)
		adminGroup.GET("/regulatory/medicines", handler.ListMedicines)
		adminGroup.POST("/regulatory/medicines/add", handler.AddMedicine)
		adminGroup.POST("/regulatory/medicines/update", handler.UpdateMedicine)
		adminGroup.POST("/regulatory/medicines/delete", handler.DeleteMedicine)
	}
}
