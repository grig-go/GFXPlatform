---
sidebar_position: 8
---

# Tips and Troubleshooting

Best practices for using Pulsar MCR effectively and solutions to common issues.

## Tips and Best Practices

### Content Organization

- **Use descriptive names** for folders, buckets, and items
- **Create a logical hierarchy** that matches your broadcast structure
- **Group related content** in the same bucket for easier scheduling
- **Archive old content** rather than deleting for historical reference

### Template Design

- **Start simple** with essential fields, add complexity as needed
- **Use validation** to ensure data quality
- **Create templates for specific use cases** (sports, news, weather)
- **Document field purposes** in tooltips and descriptions

### Scheduling Efficiency

- **Create reusable playlists** for recurring shows
- **Use time ranges** to automate content changes
- **Test schedules** before going live
- **Monitor schedule conflicts** using the schedule grid

### Integration Management

- **Test connections regularly** to ensure data freshness
- **Set appropriate sync intervals** based on data change frequency
- **Monitor sync logs** for errors
- **Use presets** when available for faster setup

### Performance Tips

- **Limit the number of active real-time syncs** to reduce server load
- **Use batch operations** for bulk content changes
- **Close unused tabs** to free up memory
- **Clear browser cache** periodically

## Troubleshooting

### Common Issues

#### Cannot Log In

- Verify your email and password
- Check if your account is active (contact administrator)
- Clear browser cache and cookies
- Try a different browser

#### Content Not Appearing in Schedule

- Verify the schedule is set to **Active**
- Check the time range matches current time
- Confirm the days of week are selected
- Verify the playlist is assigned to the correct channel

#### Integration Sync Failing

- Check the endpoint URL is correct
- Verify authentication credentials
- Test the connection manually
- Review error messages in sync logs
- Check if the source service is online

#### Widget Not Connecting to Unreal

- Verify Unreal Engine is running
- Check the channel connection settings
- Confirm RCP is enabled in Unreal
- Verify firewall settings allow connection

#### Layout Not Saving

- Check you are logged in
- Refresh the page and try again
- Clear browser local storage
- Report persistent issues to support

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Connection refused" | Cannot reach the server | Check network/firewall settings |
| "Authentication failed" | Login credentials incorrect | Re-enter credentials or reset password |
| "Permission denied" | Insufficient access rights | Contact administrator for permissions |
| "Sync timeout" | Data source taking too long | Check source availability, increase timeout |
| "Invalid template" | Template structure error | Review and fix template form |

### Getting Help

If you encounter issues not covered in this guide:

1. Check the error message details
2. Review recent changes that might have caused the issue
3. Contact your system administrator
4. Report bugs at the project issue tracker

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save current item |
| `Delete` | Delete selected items |
| `Ctrl + A` | Select all items in grid |
| `Escape` | Cancel current operation |
| `F5` | Refresh current view |

## Supported File Formats

### Media Files

- Images: PNG, JPG, JPEG, GIF, WebP
- Video: MP4, WebM, MOV

### Data Files

- CSV (comma-separated values)
- Excel (.xlsx, .xls)
- JSON
- XML
- RSS/Atom feeds

## System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Minimum 1920x1080 screen resolution recommended
- Stable internet connection
- For Unreal Engine features: Network access to Unreal Engine server
