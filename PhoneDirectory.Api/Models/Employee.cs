namespace PhoneDirectory.Api.Models;

public class Employee
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? MiddleName { get; set; }
    public string? Position { get; set; }
    public string? Department { get; set; }
    public string? Building { get; set; }
    public string? OfficeNumber { get; set; }
    public string? InternalPhone { get; set; }
    public string? CityPhone { get; set; }
    public string? MobilePhone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}