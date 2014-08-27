docker ps -a --no-trunc | grep Exit | awk "{print $1}" | xargs -I {} docker rm {}
echo $?
