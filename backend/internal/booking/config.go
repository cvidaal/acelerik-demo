package booking

const (
	pricePerChildCents = 1500
	depositCents       = 5000
	maxPartiesPerSlot  = 3
	maxChildren        = 25
	packageJungla      = "jungla"
)

type Slot struct {
	StartTime string
	EndTime   string
}

var bookingSlots = []Slot{
	{StartTime: "11:00", EndTime: "13:00"},
	{StartTime: "13:00", EndTime: "15:00"},
	{StartTime: "16:00", EndTime: "18:00"},
	{StartTime: "18:00", EndTime: "20:00"},
}

func findSlot(startTime string) (Slot, bool) {
	for _, slot := range bookingSlots {
		if slot.StartTime == startTime {
			return slot, true
		}
	}

	return Slot{}, false
}
